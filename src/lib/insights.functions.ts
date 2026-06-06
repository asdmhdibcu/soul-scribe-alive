import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EntryLite = z.object({
  date: z.string(),
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  mood_label: z.string().nullable().optional(),
  mood_x: z.number().nullable().optional(),
  mood_y: z.number().nullable().optional(),
  focus_word: z.string().nullable().optional(),
  one_thing: z.string().nullable().optional(),
});

const Schema = z.object({
  prediction: z.string(),
  patterns: z.array(
    z.object({
      text: z.string(),
      emoji: z.string(),
    })
  ),
});

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ entries: z.array(EntryLite).default([]) }).parse(data)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    if (!data.entries.length) {
      return {
        prediction:
          "Not enough data yet. Capture a few more sessions and ALIVE will start seeing the shape of your week.",
        patterns: [],
      };
    }

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const corpus = data.entries
      .slice(0, 14)
      .map(
        (e) =>
          `[${e.date}] mood=${e.mood_label ?? "?"} (x=${e.mood_x ?? 0}, y=${e.mood_y ?? 0}) focus=${e.focus_word ?? "-"} one_thing=${e.one_thing ?? "-"}\n  ${(e.content ?? "").slice(0, 280)}`
      )
      .join("\n\n");

    try {
      const { experimental_output } = await generateText({
        model,
        system: `You are ALIVE, an empathetic pattern-detection diary AI. You read the user's recent diary entries and (1) predict the week ahead in 3-4 specific, honest, empowering sentences referencing real patterns; (2) surface 2-4 concrete pattern cards. Be specific. Reference actual days/moods/words. Never generic.`,
        prompt: `Recent entries:\n\n${corpus}\n\nReturn:\n- prediction: 3-4 sentence forecast for the coming week.\n- patterns: 2-4 short pattern statements (max 14 words each), each with a single emoji that matches.`,
        experimental_output: Output.object({ schema: Schema }),
      });
      return experimental_output;
    } catch (err) {
      console.error("[insights] AI error", err);
      return {
        prediction:
          "This week looks like a continuation of what you've been building. Stay with the small daily ritual — that's where the change is happening.",
        patterns: [
          { text: "You show up more than you give yourself credit for", emoji: "🌱" },
        ],
      };
    }
  });
