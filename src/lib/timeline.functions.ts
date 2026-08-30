import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Chapter = z.object({
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  summary: z.string(),
  key_emotions: z.array(z.string()).max(6),
  important_memories: z.array(z.string()).max(5),
  entry_dates: z.array(z.string()).default([]),
});

const Schema = z.object({
  chapters: z.array(Chapter),
});

export const generateTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase } = context;
    const { data: entries, error } = await (supabase as any)
      .from("diary_entries")
      .select("date,title,content,focus_word,one_thing,mood_color,photos")
      .order("date", { ascending: true });

    if (error) throw error;

    const list = entries ?? [];
    if (list.length < 2) {
      return {
        chapters: [] as z.infer<typeof Chapter>[],
        photos: {} as Record<string, string[]>,
      };
    }

    const photosByDate: Record<string, string[]> = {};
    for (const e of list) {
      const ph = Array.isArray((e as any).photos) ? (e as any).photos : [];
      const urls = ph
        .map((p: any) => (typeof p === "string" ? p : p?.url))
        .filter(Boolean);
      if (urls.length) photosByDate[e.date] = urls;
    }

    const corpus = list
      .map(
        (e: any) =>
          `[${e.date}] ${e.title ?? ""} | focus=${e.focus_word ?? "-"} | one_thing=${e.one_thing ?? "-"}\n  ${(e.content ?? "").slice(0, 220)}`
      )
      .join("\n\n");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const { experimental_output } = await generateText({
        model,
        system: `You are ALIVE, a biographer reading a user's diary. Group their entries into meaningful life CHAPTERS — coherent emotional/thematic periods (e.g. "Starting University", "Building My First Business", "A Difficult Season", "Learning Discipline", "Finding My Direction"). Chapters should span days, weeks, or months — not single days. Use real dates from the entries. Be specific, warm, literary. Avoid generic titles.`,
        prompt: `Diary entries (chronological):\n\n${corpus}\n\nReturn 2-8 chapters covering the full timespan. For each chapter:\n- title: evocative, specific (3-6 words)\n- start_date / end_date: ISO YYYY-MM-DD from real entries\n- summary: 2-3 sentences capturing what this period was about\n- key_emotions: 2-4 single-word emotions\n- important_memories: 2-4 short phrases referencing actual moments\n- entry_dates: list of entry dates included in this chapter`,
        experimental_output: Output.object({ schema: Schema }),
      });
      return { chapters: experimental_output.chapters, photos: photosByDate };
    } catch (err) {
      console.error("[timeline] AI error", err);
      return { chapters: [], photos: photosByDate };
    }
  });
