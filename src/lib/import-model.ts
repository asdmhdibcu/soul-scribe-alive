/** Pure rules for importing old notes. Tested directly. */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

function iso(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m, d));
  if (dt.getUTCMonth() !== m || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** A date written at the start of a string, in a common form, or null. */
function leadingDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(+m[1], +m[2] - 1, +m[3]);
  m = t.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+(\\d{4})`, "i"));
  if (m) return iso(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), +m[1]);
  m = t.match(
    new RegExp(
      `^(?:[a-z]+day,?\\s+)?${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`,
      "i",
    ),
  );
  if (m) return iso(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2]);
  return null;
}

/** Date for an imported file: from its name, else its first line, else when it was last modified. */
export function detectDate(name: string, text: string, lastModified: number): string {
  const m = name.match(/(\d{4})-?(\d{2})-?(\d{2})/);
  const fromName = m ? iso(+m[1], +m[2] - 1, +m[3]) : null;
  const firstLine = text.split("\n").find((l) => l.trim()) ?? "";
  return fromName ?? leadingDate(firstLine) ?? new Date(lastModified).toISOString().slice(0, 10);
}

/** Splits pasted text at lines that are only a date; otherwise one undated entry. */
export function splitDatedEntries(text: string): { date: string | null; text: string }[] {
  const out: { date: string | null; text: string }[] = [];
  let current: { date: string | null; lines: string[] } | null = null;
  for (const line of text.split("\n")) {
    const d = leadingDate(line);
    const onlyDate =
      d && line.trim().replace(/[—–-]\s*$/, "").length <= 32 && !/[.!?]\s*\S/.test(line.trim());
    if (d && onlyDate) {
      if (current) out.push({ date: current.date, text: current.lines.join("\n").trim() });
      current = { date: d, lines: [] };
    } else {
      if (!current) current = { date: null, lines: [] };
      current.lines.push(line);
    }
  }
  if (current) out.push({ date: current.date, text: current.lines.join("\n").trim() });
  return out.filter((e) => e.text);
}

type DayOneEntry = {
  uuid: string;
  creationDate: string;
  text?: string;
  photos?: { identifier?: string; md5: string; type?: string }[];
};

/** Entries from a Day One export's Journal.json: date, text (image markers removed), photo files. */
export function parseDayOne(journal: { entries?: DayOneEntry[] }) {
  return (journal.entries ?? [])
    .map((e) => ({
      uuid: e.uuid,
      capturedAt: e.creationDate,
      text: (e.text ?? "")
        .replace(/!\[[^\]]*\]\(dayone-moment:[^)]*\)/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
      photos: (e.photos ?? []).map((p) => {
        const ext = (p.type ?? "jpeg").toLowerCase();
        return { file: `photos/${p.md5}.${ext}`, type: `image/${ext === "jpg" ? "jpeg" : ext}` };
      }),
    }))
    .filter((e) => e.text || e.photos.length);
}

/** A stable UUID (v5-style, from SHA-256) for an imported item, so re-imports don't duplicate. */
export async function stableUuid(seed: string): Promise<string> {
  const h = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
  ).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
