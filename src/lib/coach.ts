import { loadOwnAi } from "@/lib/ai-client";
import { loadMoments } from "@/lib/moments";
import { loadThreadDetails } from "@/lib/sorter";
import { generateCoach } from "@/lib/coach.functions";
import { recentWindow, validateCoach, type BriefSource, type CoachItem } from "@/lib/brief-model";
import { supabase } from "@/integrations/supabase/client";

/**
 * Coach suggestions, built on this device from the person's intentions,
 * hopes and projects (with their quotes) and the last 14 days. Only
 * suggestions quoting their own words on the cited day survive.
 */
export async function coachSuggestions(max: number, today: string): Promise<CoachItem[]> {
  const [moments, threads] = await Promise.all([loadMoments({ limit: 2000 }), loadThreadDetails()]);
  const text = (m: (typeof moments)[number]) =>
    [m.text ?? "", m.fileText].filter((t) => t.trim()).join("\n\n");
  const { from } = recentWindow(today);
  const relevant = threads.filter(
    (t) => !t.hidden && t.state === "warm" && ["intention", "hope", "project"].includes(t.kind),
  );
  const said = relevant.slice(0, 40).map((t) => ({
    title: t.title,
    kind: t.kind,
    quotes: [t.first, ...t.later]
      .filter(Boolean)
      .slice(0, 4)
      .map((q) => ({ date: q!.day, quote: q!.quote })),
  }));
  const recentDays = moments
    .filter((m) => m.day >= from && text(m))
    .map((m) => ({ date: m.day, text: text(m) }));
  if (!said.length) return [];
  const raw = await generateCoach({
    data: { ai: await loadOwnAi(), max, said, recentDays: recentDays.slice(0, 200) },
  });
  const sources: BriefSource[] = [
    ...moments.map((m) => ({ date: m.day, text: text(m) })),
    ...said.flatMap((t) => t.quotes.map((q) => ({ date: q.date, text: q.quote }))),
  ];
  return validateCoach(raw.suggestions, sources, max);
}

/** Whether the brief may carry one Coach line (on by default; switchable in Settings). */
export async function coachInBrief(): Promise<boolean> {
  const { data } = await supabase.from("user_prefs").select("coach_in_brief").maybeSingle();
  return data?.coach_in_brief ?? true;
}
