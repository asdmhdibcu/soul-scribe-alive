/** Pure rules for what a capture holds. No imports; tested directly. */

export const MAX_PHOTOS = 3;
export const FREE_STORAGE_BYTES = 500 * 1024 * 1024;
export const SOUL_STORAGE_BYTES = 20 * 1024 * 1024 * 1024;

type FileLike = { name: string; type: string; size: number };

export function splitAttachments<T extends FileLike>(picked: T[]) {
  const images = picked.filter((p) => p.type.startsWith("image/"));
  return {
    photos: images.slice(0, MAX_PHOTOS),
    files: picked.filter((p) => !p.type.startsWith("image/")),
    extraPhotos: Math.max(0, images.length - MAX_PHOTOS),
  };
}

export function storageCheck(usedBytes: number, addBytes: number, limitBytes: number) {
  return {
    ok: usedBytes + addBytes <= limitBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes),
  };
}

export type CaptureKind = "text" | "voice" | "photo" | "file";

export function momentKindFor(c: {
  text: string;
  photos: number;
  files: number;
  audio: boolean;
}): CaptureKind {
  if (c.audio) return "voice";
  if (c.photos > 0) return "photo";
  if (c.files > 0 && !c.text.trim()) return "file";
  return "text";
}

/** Storage path inside the private bucket. The original name is stored encrypted, never here. */
export function storagePath(userId: string, momentId: string, fileId: string) {
  return `${userId}/${momentId}/${fileId}.bin`;
}

export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024)
    return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
