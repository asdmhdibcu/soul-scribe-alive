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

const Input = z.object({
  // Decrypted on the device and sent only for this request; never stored.
  entries: z
    .array(z.object({ date: z.string(), title: z.string().nullable(), content: z.string() }))
    .max(400),
});

export const generateTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const list = [...data.entries].sort((a, b) => a.date.localeCompare(b.date));
    if (list.length < 2) return { chapters: [] as z.infer<typeof Chapter>[] };

    const corpus = list.map((e) => `[${e.date}]\n  ${e.content.slice(0, 400)}`).join("\n\n");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    try {
      const { experimental_output } = await generateText({
        model,
        system: `You are ALIVE, a biographer reading a user's diary. Group their entries into meaningful life CHAPTERS — coherent emotional/thematic periods (e.g. "Starting University", "Building My First Business", "A Difficult Season", "Learning Discipline", "Finding My Direction"). Chapters should span days, weeks, or months — not single days. Use real dates from the entries. Be specific, warm, literary. Avoid generic titles.`,
        prompt: `Diary entries (chronological):\n\n${corpus}\n\nReturn 2-8 chapters covering the full timespan. For each chapter:\n- title: evocative, specific (3-6 words)\n- start_date / end_date: ISO YYYY-MM-DD from real entries\n- summary: 2-3 sentences capturing what this period was about\n- key_emotions: 2-4 single-word emotions\n- important_memories: 2-4 short phrases copied WORD FOR WORD from the entries (exact quotes, no paraphrase)\n- entry_dates: list of entry dates included in this chapter`,
        experimental_output: Output.object({ schema: Schema }),
      });
      return { chapters: experimental_output.chapters };
    } catch (err) {
      console.error("[timeline] AI error", err);
      return { chapters: [] as z.infer<typeof Chapter>[] };
    }
  });
