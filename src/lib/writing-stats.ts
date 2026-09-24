/**
 * Counts days written, instead of the old gamification. Pure, tested directly.
 * Language rule: counts only ("you've written 23 of the last 30 days"),
 * never "you broke it" or guilt framing.
 */

/** Distinct YYYY-MM-DD days within the `n` days ending on `today` (inclusive). */
export function daysWrittenInLast(days: string[], today: string, n = 30): number {
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (n - 1));
  const from = start.toISOString().slice(0, 10);
  return new Set(days.filter((d) => d >= from && d <= today)).size;
}

/** The person's own words from a reflection session. The AI page is never included. */
export function sessionRawText(parts: {
  oneAnswer?: string;
  voiceTranscript?: string;
  story?: string;
}): string {
  return [parts.oneAnswer, parts.voiceTranscript, parts.story]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export type DayMood = { x: number; y: number; color: string } | null;

export type DayEntry = {
  id: string;
  date: string;
  title: string | null;
  content: string;
  mood_x: number | null;
  mood_y: number | null;
  mood_color: string | null;
  focus_word: string | null;
  one_thing: string | null;
  created_at: string;
};

/** One entry per day with text, newest first, carrying that day's mood if any. */
export function buildDayEntries(
  moments: { day: string; text: string | null }[],
  moods: Record<string, DayMood>,
): DayEntry[] {
  const byDay = new Map<string, string[]>();
  for (const m of moments) {
    if (!m.text?.trim()) continue;
    byDay.set(m.day, [...(byDay.get(m.day) ?? []), m.text.trim()]);
  }
  return [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, texts]) => {
      const mood = moods[day] ?? null;
      return {
        id: day,
        date: day,
        title: null,
        content: texts.join("\n\n"),
        mood_x: mood?.x ?? null,
        mood_y: mood?.y ?? null,
        mood_color: mood?.color ?? null,
        focus_word: null,
        one_thing: null,
        created_at: `${day}T00:00:00Z`,
      };
    });
}
