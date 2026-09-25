import { supabase } from "@/integrations/supabase/client";
import {
  decryptBlob,
  decryptField,
  decryptJson,
  encryptBlob,
  encryptField,
  encryptJson,
  isDecryptFailure,
  requireMasterKey,
} from "@/lib/crypto";
import { daysWrittenInLast, type DayMood } from "@/lib/writing-stats";
import { combineTextAndTranscript } from "@/lib/voice-model";
import { enqueue, flush, registerSenders } from "@/lib/outbox";
import { readFileText } from "@/lib/file-text";
import {
  FREE_STORAGE_BYTES,
  SOUL_STORAGE_BYTES,
  momentKindFor,
  storagePath,
} from "@/lib/capture-model";
import { prepareTextMoment, toMoment, type Moment, type MomentRow } from "@/lib/moments-model";

export type { Moment } from "@/lib/moments-model";
export { filterMoments, momentsForAi, quotesInMoments } from "@/lib/moments-model";

const MEDIA_BUCKET = "alive-media";

async function openText(payload: string): Promise<string | null> {
  const value = await decryptField(payload);
  return isDecryptFailure(value) ? null : value;
}

/**
 * Loads the signed-in person's moments, newest first, and decrypts them on
 * this device. The server only ever returns ciphertext, so search and
 * filtering happen here after decryption.
 */
export async function loadMoments(opts: { sinceDay?: string; limit?: number } = {}) {
  let q = supabase
    .from("moments")
    .select(
      "id, captured_at, kind, body_enc, audio_path, photo_path, area_enc, moment_files(id, path, kind, name_enc, mime_enc, text_enc, size_bytes)",
    )
    .order("captured_at", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (opts.sinceDay) q = q.gte("captured_at", `${opts.sinceDay}T00:00:00Z`);
  const { data, error } = await q;
  if (error) throw error;
  return Promise.all(((data ?? []) as MomentRow[]).map((r) => toMoment(r, openText)));
}

export async function deleteMoment(m: Moment) {
  const paths = [m.audioPath, m.photoPath, ...m.attachments.map((a) => a.path)].filter(
    Boolean,
  ) as string[];
  if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  const { error } = await supabase.from("moments").delete().eq("id", m.id);
  if (error) throw error;
}

/** Downloads an encrypted photo or recording and returns a local object URL. */
export async function openMedia(path: string, type: string): Promise<string> {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) throw error ?? new Error("Could not load media.");
  const plain = await decryptBlob(data, requireMasterKey());
  return URL.createObjectURL(new Blob([plain], { type }));
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

/** "You've written X of the last 30 days". Reads timestamps only, no content. */
export async function loadDaysWritten(n = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (n - 1));
  const { data, error } = await supabase
    .from("moments")
    .select("captured_at")
    .gte("captured_at", `${since.toISOString().slice(0, 10)}T00:00:00Z`);
  if (error) throw error;
  const days = (data ?? []).map((r) => (r.captured_at as string).slice(0, 10));
  return daysWrittenInLast(days, todayUtc(), n);
}

/**
 * Saves a finished reflection session. The person's own words become a
 * moment (the canonical record); the AI-written page and the mood go to the
 * day row as derived, regenerable views.
 */
export async function saveSessionDay(opts: {
  rawText: string;
  rendered: { title: string; content: string };
  mood: DayMood;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const now = new Date().toISOString();
  if (opts.rawText.trim()) {
    const { error } = await supabase.from("moments").insert({
      user_id: u.user.id,
      captured_at: now,
      kind: "text",
      body_enc: await encryptField(opts.rawText),
    });
    if (error) throw error;
  }
  const { error: dayErr } = await supabase.from("days").upsert(
    {
      user_id: u.user.id,
      date: now.slice(0, 10),
      rendered_enc: await encryptJson(opts.rendered),
      mood_enc: opts.mood ? await encryptJson(opts.mood) : null,
    },
    { onConflict: "user_id,date" },
  );
  if (dayErr) throw dayErr;
}

/** Whether today's reflection session has already been saved. */
export async function hasSessionToday() {
  const { data } = await supabase
    .from("days")
    .select("id")
    .eq("date", todayUtc())
    .not("rendered_enc", "is", null)
    .maybeSingle();
  return Boolean(data);
}

/** Decrypted moods per day, for Insights. */
export async function loadDayMoods(): Promise<Record<string, DayMood>> {
  const { data, error } = await supabase.from("days").select("date, mood_enc");
  if (error) throw error;
  const out: Record<string, DayMood> = {};
  for (const r of data ?? []) {
    if (r.mood_enc) out[r.date as string] = await decryptJson<DayMood>(r.mood_enc, null);
  }
  return out;
}

/** Fired after a capture is stored, so open pages (e.g. the Vault) can refresh. */
export const MOMENT_SAVED_EVENT = "alive:moment-saved";

/* ------------------------------------------------------------------ */
/* Capturing: seal on the device, queue in the outbox, then upload     */
/* ------------------------------------------------------------------ */

export type CaptureInput = {
  /** Client-generated so later steps (e.g. a transcript) can update it. */
  id: string;
  capturedAt: string;
  text: string;
  photos: File[];
  files: File[];
  audio?: Blob | null;
};

/** A capture after encryption: safe to keep on the device until it uploads. */
type SealedCapture = {
  id: string;
  userId: string;
  capturedAt: string;
  kind: string;
  bodyEnc: string | null;
  audioPath: string | null;
  files: {
    id: string;
    path: string;
    kind: "photo" | "file" | "audio";
    blob: Blob;
    nameEnc: string;
    mimeEnc: string;
    /** Text read from the file on the device, encrypted ("" when unreadable). */
    textEnc: string | null;
    size: number;
  }[];
};

type SealedTranscript = { momentId: string; bodyEnc: string };

/** Bytes this person has stored (encrypted sizes of photos, files and audio). */
export async function loadStorageUsed(): Promise<number> {
  const { data, error } = await supabase.from("moment_files").select("size_bytes");
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + Number(r.size_bytes ?? 0), 0);
}

export function storageLimitFor(plan: string | null) {
  return plan && plan !== "free" ? SOUL_STORAGE_BYTES : FREE_STORAGE_BYTES;
}

async function currentUserId() {
  // getSession reads the stored session, so this works offline too.
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

async function sealCapture(c: CaptureInput): Promise<SealedCapture> {
  const userId = await currentUserId();
  const key = requireMasterKey();
  const parts = [
    ...c.photos.map((f) => ({ blob: f as Blob, name: f.name, kind: "photo" as const })),
    ...c.files.map((f) => ({ blob: f as Blob, name: f.name, kind: "file" as const })),
    ...(c.audio ? [{ blob: c.audio, name: "voice-note", kind: "audio" as const }] : []),
  ];
  const files = await Promise.all(
    parts.map(async (p) => {
      const id = crypto.randomUUID();
      const sealed = await encryptBlob(p.blob, key);
      const text = p.kind === "file" ? await readFileText(p.blob as File) : "";
      return {
        id,
        path: storagePath(userId, c.id, id),
        kind: p.kind,
        blob: sealed,
        nameEnc: await encryptField(p.name),
        mimeEnc: await encryptField(p.blob.type || "application/octet-stream"),
        textEnc: text ? await encryptField(text) : null,
        size: sealed.size,
      };
    }),
  );
  const text = prepareTextMoment(c.text, new Date())?.text ?? "";
  return {
    id: c.id,
    userId,
    capturedAt: c.capturedAt,
    kind: momentKindFor({
      text,
      photos: c.photos.length,
      files: c.files.length,
      audio: Boolean(c.audio),
    }),
    bodyEnc: text ? await encryptField(text) : null,
    audioPath: files.find((f) => f.kind === "audio")?.path ?? null,
    files,
  };
}

const isDuplicate = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === "23505" || /duplicate|already exists/i.test(e.message ?? "")));

/**
 * Uploads a sealed capture. Every step is safe to repeat (fixed ids, upsert
 * for media, duplicates ignored), so a retry after a dropped connection
 * finishes the job instead of creating copies.
 */
async function sendCapture(s: SealedCapture) {
  for (const f of s.files) {
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(f.path, f.blob, { contentType: "application/octet-stream", upsert: true });
    if (error) throw error;
  }
  const { error: momentErr } = await supabase.from("moments").insert({
    id: s.id,
    user_id: s.userId,
    captured_at: s.capturedAt,
    kind: s.kind,
    body_enc: s.bodyEnc,
    audio_path: s.audioPath,
  });
  if (momentErr && !isDuplicate(momentErr)) throw momentErr;
  if (s.files.length) {
    const { error: filesErr } = await supabase.from("moment_files").upsert(
      s.files.map((f) => ({
        id: f.id,
        moment_id: s.id,
        user_id: s.userId,
        path: f.path,
        kind: f.kind,
        name_enc: f.nameEnc,
        mime_enc: f.mimeEnc,
        text_enc: f.textEnc,
        size_bytes: f.size,
      })),
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (filesErr) throw filesErr;
  }
  window.dispatchEvent(new Event(MOMENT_SAVED_EVENT));
}

async function sendTranscript(t: SealedTranscript) {
  const { error } = await supabase
    .from("moments")
    .update({ body_enc: t.bodyEnc })
    .eq("id", t.momentId);
  if (error) throw error;
  window.dispatchEvent(new Event(MOMENT_SAVED_EVENT));
}

registerSenders({
  capture: sendCapture as (p: never) => Promise<void>,
  transcript: sendTranscript as (p: never) => Promise<void>,
});

/**
 * Saves a capture: encrypts it on this device, queues it, and tries to upload.
 * Returns synced=false when it is safely stored on the device but not yet
 * uploaded (offline); it uploads automatically when the connection returns.
 */
export async function saveCapture(c: CaptureInput) {
  const sealed = await sealCapture(c);
  await enqueue({ id: c.id, type: "capture", queuedAt: new Date().toISOString(), payload: sealed });
  const { remaining } = await flush();
  return { synced: remaining === 0 };
}

/** Downloads, decrypts and saves an attachment under its original name. */
export async function downloadAttachment(a: { path: string; name: string; mime: string }) {
  const url = await openMedia(a.path, a.mime);
  const link = document.createElement("a");
  link.href = url;
  link.download = a.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Adds an on-device transcript to a saved voice moment, after any typed words. */
export async function saveTranscript(momentId: string, typed: string, transcript: string) {
  const body = combineTextAndTranscript(typed, transcript);
  if (!body) return;
  const payload: SealedTranscript = { momentId, bodyEnc: await encryptField(body) };
  await enqueue({
    id: `${momentId}:transcript`,
    type: "transcript",
    queuedAt: new Date().toISOString(),
    payload,
  });
  await flush();
}
