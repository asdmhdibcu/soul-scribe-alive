/** Pure rules for Ask: which entries to send, and linking cited dates. Tested directly. */

export type AskMoment = { id: string; day: string; text: string; area: "work" | "life" | null };
export type AreaFilter = "work" | "life" | "both";

const MAX_ENTRIES = 120;
const RECENT_DAYS = 90;
const STOP = new Set(
  "the and for was were what when where which who why how did does have has had with that this from about into your you i me my our are not but can will would should could its it's they them their there then than just also very been being".split(
    " ",
  ),
);

function words(s: string) {
  return (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (w) => w.length >= 3 && !STOP.has(w),
  );
}

/**
 * Chooses up to 120 entries: today's first, then entries sharing words with
 * the question (any age, best matches first), then everything from the
 * last 90 days, newest first.
 */
export function selectForAsk<T extends AskMoment>(
  list: T[],
  question: string,
  today: string,
  area: AreaFilter = "both",
): T[] {
  const pool = list.filter(
    (m) => m.text.trim() && (area === "both" || m.area === null || m.area === area),
  );
  const q = new Set(words(question));
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_DAYS);
  const from = cutoff.toISOString().slice(0, 10);

  const score = (m: T) => words(m.text).filter((w) => q.has(w)).length;
  const todays = pool.filter((m) => m.day === today);
  const matches = pool
    .filter((m) => m.day !== today && score(m) > 0)
    .sort((a, b) => score(b) - score(a) || b.day.localeCompare(a.day));
  const recent = pool
    .filter((m) => m.day !== today && m.day >= from)
    .sort((a, b) => b.day.localeCompare(a.day));

  const out: T[] = [];
  const seen = new Set<string>();
  for (const m of [...todays, ...matches, ...recent]) {
    if (out.length >= MAX_ENTRIES) break;
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
const DATE_RE = new RegExp(
  `(\\d{4}-\\d{2}-\\d{2})|\\b${MONTH}\\.?\\s+${DAY}\\b(?:,?\\s+(\\d{4}))?|\\b${DAY}\\s+${MONTH}\\b(?:\\s+(\\d{4}))?`,
  "gi",
);

export type Segment = { text: string } | { text: string; day: string };

/**
 * Splits an answer so each date that matches an entry the AI was given
 * becomes a link to that day. Dates with no matching entry stay plain.
 */
export function linkCitedDates(answer: string, days: string[]): Segment[] {
  const known = new Set(days);
  const find = (month: number, day: number, year?: string) => {
    const md = `-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hits = days.filter((d) => d.endsWith(md) && (!year || d.startsWith(year)));
    return hits.sort().reverse()[0];
  };
  const out: Segment[] = [];
  let last = 0;
  for (const m of answer.matchAll(DATE_RE)) {
    let day: string | undefined;
    if (m[1]) day = known.has(m[1]) ? m[1] : undefined;
    else if (m[2]) day = find(MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), Number(m[3]), m[4]);
    else if (m[5]) day = find(MONTHS.indexOf(m[6].slice(0, 3).toLowerCase()), Number(m[5]), m[7]);
    if (!day) continue;
    if (m.index! > last) out.push({ text: answer.slice(last, m.index) });
    out.push({ text: m[0], day });
    last = m.index! + m[0].length;
  }
  if (last < answer.length) out.push({ text: answer.slice(last) });
  return out;
}
