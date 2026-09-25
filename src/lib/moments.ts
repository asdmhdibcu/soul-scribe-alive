import { supabase } from "@/integrations/supabase/client";
import {
  decryptBlob,
  decryptField,
  decryptJson,
  encryptField,
  encryptJson,
  isDecryptFailure,
  requireMasterKey,
} from "@/lib/crypto";
import { daysWrittenInLast, type DayMood } from "@/lib/writing-stats";
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
    .select("id, captured_at, kind, body_enc, audio_path, photo_path")
    .order("captured_at", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (opts.sinceDay) q = q.gte("captured_at", `${opts.sinceDay}T00:00:00Z`);
  const { data, error } = await q;
  if (error) throw error;
  return Promise.all(((data ?? []) as MomentRow[]).map((r) => toMoment(r, openText)));
}

export async function deleteMoment(m: Moment) {
  const paths = [m.audioPath, m.photoPath].filter(Boolean) as string[];
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

/** Encrypts typed text on this device and stores it as a new moment. */
export async function saveTextMoment(text: string) {
  const prepared = prepareTextMoment(text, new Date());
  if (!prepared) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("moments").insert({
    user_id: u.user.id,
    captured_at: prepared.captured_at,
    kind: prepared.kind,
    body_enc: await encryptField(prepared.text),
  });
  if (error) throw error;
  window.dispatchEvent(new Event(MOMENT_SAVED_EVENT));
}
