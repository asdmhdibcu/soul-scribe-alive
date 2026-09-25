/**
 * The shape the UI works with after a moment is decrypted on the device.
 * No imports on purpose: this is the pure core, tested directly.
 */

export type MomentKind = "text" | "voice" | "photo";

export type MomentRow = {
  id: string;
  captured_at: string;
  kind: string;
  body_enc: string | null;
  audio_path: string | null;
  photo_path: string | null;
};

export type Moment = {
  id: string;
  capturedAt: string;
  /** YYYY-MM-DD in UTC, as cited to the AI and in links. */
  day: string;
  kind: MomentKind;
  /** Decrypted text, or null when the moment has none or it failed. */
  text: string | null;
  /** True only when there was text and it could not be decrypted. */
  decryptFailed: boolean;
  hasAudio: boolean;
  hasPhoto: boolean;
  audioPath: string | null;
  photoPath: string | null;
};

/** `open` returns the plaintext, or null if decryption failed. */
export async function toMoment(
  row: MomentRow,
  open: (payload: string) => Promise<string | null>,
): Promise<Moment> {
  const text = row.body_enc ? await open(row.body_enc) : null;
  const kind: MomentKind = row.kind === "voice" || row.kind === "photo" ? row.kind : "text";
  return {
    id: row.id,
    capturedAt: row.captured_at,
    day: row.captured_at.slice(0, 10),
    kind,
    text,
    decryptFailed: Boolean(row.body_enc) && text === null,
    hasAudio: Boolean(row.audio_path),
    hasPhoto: Boolean(row.photo_path),
    audioPath: row.audio_path,
    photoPath: row.photo_path,
  };
}

export type MomentFilter = {
  search?: string;
  kind?: MomentKind;
  /** Inclusive YYYY-MM-DD. */
  since?: string;
};

export function filterMoments(list: Moment[], f: MomentFilter): Moment[] {
  const term = f.search?.trim().toLowerCase() ?? "";
  return list.filter(
    (m) =>
      (!f.kind || m.kind === f.kind) &&
      (!f.since || m.day >= f.since) &&
      (!term || (m.text ?? "").toLowerCase().includes(term)),
  );
}

/** What leaves the device for AI features: dated raw text only. */
export function momentsForAi(list: Moment[]) {
  return list
    .filter((m) => m.text && m.text.trim())
    .map((m) => ({ date: m.day, title: null, content: m.text as string }));
}

/** Keep only quotes that appear word for word in some moment (the citation law). */
export function quotesInMoments(quotes: string[], list: Moment[]): string[] {
  const texts = list.map((m) => m.text ?? "");
  return quotes.filter((q) => q.trim() && texts.some((t) => t.includes(q.trim())));
}

/**
 * A new text moment from the capture sheet. Raw is canonical: the text is
 * stored exactly as typed (never trimmed or edited); only an all-whitespace
 * capture is refused.
 */
export function prepareTextMoment(text: string, now: Date) {
  if (!text.trim()) return null;
  return { kind: "text" as const, captured_at: now.toISOString(), text };
}
