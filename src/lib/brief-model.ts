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
