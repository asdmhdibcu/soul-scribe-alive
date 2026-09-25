import { supabase } from "@/integrations/supabase/client";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { loadOwnAi } from "@/lib/ai-client";
import { loadMoments } from "@/lib/moments";
import { loadThreadDetails } from "@/lib/sorter";
import { generateBrief } from "@/lib/brief.functions";
import { coachInBrief, coachSuggestions } from "@/lib/coach";
import {
  echoDay,
  recentWindow,
  validateBrief,
  type BriefItem,
  type BriefSource,
} from "@/lib/brief-model";

export type Brief = { forDate: string; items: BriefItem[]; useful: number[] };

/** The person's local calendar date, YYYY-MM-DD. */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadBrief(forDate: string): Promise<Brief | null> {
  const { data } = await supabase
    .from("briefs")
    .select("items_enc, useful, opened_at")
    .eq("for_date", forDate)
    .maybeSingle();
  if (!data) return null;
  if (!data.opened_at) {
    await supabase
      .from("briefs")
      .update({ opened_at: new Date().toISOString() })
      .eq("for_date", forDate);
  }
  return {
    forDate,
    items: await decryptJson<BriefItem[]>(data.items_enc, []),
    useful: data.useful ?? [],
  };
}

/**
 * Builds today's brief on this device: gathers warm threads, the last 14
 * days and entries from a year ago (decrypted here), asks the AI, keeps
 * only items quoting the person's words on the cited day, and stores the
 * result encrypted. Returns null when there's nothing to draw on yet.
 */
export async function buildBrief(forDate: string): Promise<Brief | null> {
  const [moments, threads] = await Promise.all([loadMoments({ limit: 2000 }), loadThreadDetails()]);
  const text = (m: (typeof moments)[number]) =>
    [m.text ?? "", m.fileText].filter((t) => t.trim()).join("\n\n");
  const { from, to } = recentWindow(forDate);
  const echo = echoDay(forDate);
  const recentDays = moments
    .filter((m) => m.day >= from && m.day <= to && text(m))
    .map((m) => ({ date: m.day, text: text(m) }));
  const echoes = moments
    .filter((m) => m.day === echo && text(m))
    .map((m) => ({ date: m.day, text: text(m) }));
  const warm = threads.filter((t) => t.state === "warm" && !t.hidden);
  const latest = (t: (typeof warm)[number]) => t.later[0] ?? t.first;
  const threadInput = warm
    .filter((t) => latest(t))
    .slice(0, 40)
    .map((t) => ({
      title: t.title,
      kind: t.kind,
      latestQuote: latest(t)!.quote,
      latestDate: latest(t)!.day,
    }));

  if (!recentDays.length && !echoes.length && !threadInput.length) return null;

  const raw = await generateBrief({
    data: {
      ai: await loadOwnAi(),
      threads: threadInput,
      recentDays: recentDays.slice(0, 200),
      echoes: echoes.slice(0, 20),
    },
  });
  // Sources for the quote check: every entry, plus thread quotes with their dates.
  const sources: BriefSource[] = [
    ...moments.map((m) => ({ date: m.day, text: text(m) })),
    ...warm.flatMap((t) =>
      [t.first, ...t.later].filter(Boolean).map((q) => ({ date: q!.day, text: q!.quote })),
    ),
  ];
  const items = validateBrief(raw.items, sources);
  // At most one Coach line, only if the person hasn't switched it off.
  if (await coachInBrief().catch(() => false)) {
    const [line] = await coachSuggestions(1, forDate).catch(() => []);
    if (line) items.push({ kind: "coach", ...line });
  }

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("briefs").upsert(
    {
      user_id: u.user.id,
      for_date: forDate,
      items_enc: await encryptJson(items),
      opened_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
  if (error) throw error;
  return { forDate, items, useful: [] };
}

export async function markUseful(brief: Brief, index: number) {
  const useful = Array.from(new Set([...brief.useful, index]));
  await supabase.from("briefs").update({ useful }).eq("for_date", brief.forDate);
  return { ...brief, useful };
}
