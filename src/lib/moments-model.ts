/**
 * The shape the UI works with after a moment is decrypted on the device.
 * No imports on purpose: this is the pure core, tested directly.
 */

export type MomentKind = "text" | "voice" | "photo" | "file";

export type AttachmentRow = {
  id: string;
  path: string;
  kind: string;
  name_enc: string | null;
  mime_enc: string | null;
  text_enc?: string | null;
  size_bytes: number;
};

export type Attachment = {
  id: string;
  path: string;
  kind: "photo" | "file";
  name: string;
  mime: string;
  size: number;
};

export type MomentRow = {
  id: string;
  captured_at: string;
  kind: string;
  body_enc: string | null;
  audio_path: string | null;
  photo_path: string | null;
  area_enc?: string | null;
  moment_files?: AttachmentRow[] | null;
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
  /** Recording format (mp4 on iPhone, webm elsewhere), decrypted. */
  audioMime: string | null;
  photoPath: string | null;
  attachments: Attachment[];
  /** Text read from attached files, decrypted ("" when none). */
  fileText: string;
  /** Work or life, once the filing pass has tagged it. */
  area: "work" | "life" | null;
};

/** `open` returns the plaintext, or null if decryption failed. */
export async function toMoment(
  row: MomentRow,
  open: (payload: string) => Promise<string | null>,
): Promise<Moment> {
  const text = row.body_enc ? await open(row.body_enc) : null;
  const kind: MomentKind =
    row.kind === "voice" || row.kind === "photo" || row.kind === "file" ? row.kind : "text";
  const audioRow = (row.moment_files ?? []).find((a) => a.kind === "audio");
  const audioMime = audioRow?.mime_enc ? await open(audioRow.mime_enc) : null;
  // Audio rows exist only for storage accounting; the recording is audio_path.
  const attachments = await Promise.all(
    (row.moment_files ?? [])
      .filter((a) => a.kind !== "audio")
      .map(async (a) => ({
        id: a.id,
        path: a.path,
        kind: (a.kind === "photo" ? "photo" : "file") as "photo" | "file",
        name: (a.name_enc && (await open(a.name_enc))) || "Attachment",
        mime: (a.mime_enc && (await open(a.mime_enc))) || "application/octet-stream",
        size: a.size_bytes,
      })),
  );
  const fileText = (
    await Promise.all(
      (row.moment_files ?? []).map(async (a) =>
        a.text_enc ? ((await open(a.text_enc)) ?? "") : "",
      ),
    )
  )
    .filter(Boolean)
    .join("\n\n");
  const areaText = row.area_enc ? await open(row.area_enc) : null;
  return {
    id: row.id,
    capturedAt: row.captured_at,
    day: row.captured_at.slice(0, 10),
    kind,
    text,
    decryptFailed: Boolean(row.body_enc) && text === null,
    hasAudio: Boolean(row.audio_path),
    hasPhoto: Boolean(row.photo_path) || attachments.some((a) => a.kind === "photo"),
    audioPath: row.audio_path,
    audioMime,
    photoPath: row.photo_path,
    attachments,
    fileText,
    area: areaText === "work" || areaText === "life" ? areaText : null,
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
    .map((m) => ({ m, content: [m.text ?? "", m.fileText].filter((t) => t.trim()).join("\n\n") }))
    .filter(({ content }) => content)
    .map(({ m, content }) => ({ date: m.day, title: null, content }));
}

/** Keep only quotes that appear word for word in some moment (the citation law). */
export function quotesInMoments(quotes: string[], list: Moment[]): string[] {
  const texts = list.map((m) => `${m.text ?? ""}\n${m.fileText}`);
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
