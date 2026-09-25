/** Pure rules for reading text out of attached files. No imports; tested directly. */

export const MAX_FILE_TEXT = 50_000;

export function readableKind(mime: string, name: string): "pdf" | "docx" | "text" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.includes("wordprocessingml") || ext === "docx") return "docx";
  if (mime.startsWith("text/") || ["txt", "md", "markdown", "csv", "rtf", "json"].includes(ext)) {
    return "text";
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Text from a .docx word/document.xml: one line per paragraph. */
export function docxXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e])
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .split("\n")
    .map((l) => l.replace(/[  ]+$/g, ""))
    .filter((l, i, all) => l.trim() || (i > 0 && all[i - 1].trim()))
    .join("\n")
    .trim();
}

export function clampText(text: string): string {
  return text.trim().slice(0, MAX_FILE_TEXT);
}
