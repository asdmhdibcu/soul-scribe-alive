/**
 * Rules for the silent filing pass. Pure, no imports; tested directly.
 * The citation law applies: anything the AI files must quote the moment
 * word for word, or it is dropped.
 */

export const THREAD_KINDS = ["worry", "project", "person", "idea", "hope"] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];
export type Area = "work" | "life";
export const QUIET_AFTER_DAYS = 14;

type RawThread = { existingId: string | null; title: string; kind: string; quote: string };
type RawIntention = { existingId: string | null; title: string; quote: string };
export type Extraction = { threads: RawThread[]; intentions: RawIntention[]; area: string };

const quoted = (q: string, text: string) => Boolean(q.trim()) && text.includes(q.trim());

export function validateExtraction(
  result: Extraction,
  momentText: string,
  existing: { id: string }[],
) {
  const known = new Set(existing.map((e) => e.id));
  const fixId = (id: string | null) => (id && known.has(id) ? id : null);
  const threads = result.threads
    .filter(
      (t) => (THREAD_KINDS as readonly string[]).includes(t.kind) && quoted(t.quote, momentText),
    )
    .map((t) => ({
      ...t,
      kind: t.kind as ThreadKind,
      quote: t.quote.trim(),
      existingId: fixId(t.existingId),
    }));
  const intentions = result.intentions
    .filter((i) => quoted(i.quote, momentText))
    .map((i) => ({ ...i, quote: i.quote.trim(), existingId: fixId(i.existingId) }));
  const dropped =
    result.threads.length - threads.length + (result.intentions.length - intentions.length);
  const area: Area = result.area === "work" ? "work" : "life";
  return { threads, intentions, area, dropped };
}

export function nextThreadState(
  current: { last_seen: string; mention_count: number },
  capturedAt: string,
) {
  return {
    last_seen: capturedAt > current.last_seen ? capturedAt : current.last_seen,
    mention_count: current.mention_count + 1,
    state: "warm" as const,
  };
}

export function isQuiet(lastSeen: string, now: Date, days = QUIET_AFTER_DAYS) {
  return now.getTime() - new Date(lastSeen).getTime() > days * 24 * 60 * 60 * 1000;
}
