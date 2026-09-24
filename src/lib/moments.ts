import { supabase } from "@/integrations/supabase/client";
import { decryptBlob, decryptField, isDecryptFailure, requireMasterKey } from "@/lib/crypto";
import { toMoment, type Moment, type MomentRow } from "@/lib/moments-model";

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
