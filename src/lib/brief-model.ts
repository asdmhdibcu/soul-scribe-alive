/** Pure rules for the morning brief. No imports; tested directly. */

export type BriefSource = { date: string; text: string };
export type BriefItem = { kind: string; text: string; citedDate: string; quote: string };

const MAX_ITEMS = 5;

/**
 * The citation law for the brief: an item stays only if its quote appears
 * word for word in something the person wrote on the cited day. Items with
 * a question mark (asking about follow-through) are dropped. At most five.
 */
export function validateBrief(items: BriefItem[], sources: BriefSource[]): BriefItem[] {
  return items
    .filter((i) => {
      const q = i.quote.trim();
      if (!q || i.text.includes("?")) return false;
      return sources.some((s) => s.date === i.citedDate && s.text.includes(q));
    })
    .slice(0, MAX_ITEMS);
}

/** The same day one year earlier (29 Feb falls back to 28 Feb). */
export function echoDay(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const prev = new Date(Date.UTC(y - 1, m - 1, d));
  if (prev.getUTCMonth() !== m - 1) prev.setUTCDate(0);
  return prev.toISOString().slice(0, 10);
}

export function recentWindow(today: string, days = 14) {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: today };
}

export type CoachItem = { text: string; citedDate: string; quote: string };

const HEALTH =
  /\b(diagnos|disorder|depress|anxiety|adhd|therapy|medicat|symptom|illness|disease|mental health)/i;

/**
 * Coach suggestions follow the same citation law as the brief, plus no
 * health talk. `max` is 1 for the brief's Coach line.
 */
export function validateCoach(items: CoachItem[], sources: BriefSource[], max: number) {
  return validateBrief(
    items.filter((i) => !HEALTH.test(i.text)).map((i) => ({ ...i, kind: "coach" })),
    sources,
  )
    .slice(0, max)
    .map(({ text, citedDate, quote }) => ({ text, citedDate, quote }));
}
