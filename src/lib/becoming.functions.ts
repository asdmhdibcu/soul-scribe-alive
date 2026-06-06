import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EntryLite = z.object({
  date: z.string(),
  content: z.string().nullable().optional(),
  focus_word: z.string().nullable().optional(),
  one_thing: z.string().nullable().optional(),
  mood_label: z.string().nullable().optional(),
});

const METRICS = [
  { key: "discipline", label: "Discipline", emoji: "💪" },
  { key: "gratitude", label: "Gratitude", emoji: "🙏" },
  { key: "self_awareness", label: "Self Awareness", emoji: "🧠" },
  { key: "relationships", label: "Relationships", emoji: "❤️" },
  { key: "spiritual_growth", label: "Spiritual Growth", emoji: "🕌" },
  { key: "resilience", label: "Resilience", emoji: "🌱" },
  { key: "purpose", label: "Purpose", emoji: "🎯" },
  { key: "learning", label: "Learning", emoji: "📚" },
] as const;

export const METRIC_DEFS = METRICS;

const MetricSchema = z.object({
  key: z.enum([
    "discipline",
    "gratitude",
    "self_awareness",
    "relationships",
    "spiritual_growth",
    "resilience",
    "purpose",
    "learning",
  ]),
  score: z.number().min(0).max(100),
  trend: z.enum(["up", "down", "steady"]),
  delta_pct: z.number(),
  evidence: z.string(),
});

const Schema = z.object({
  metrics: z.array(MetricSchema),
  summary: z.string(),
});

export const generateBecoming = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        entries: z.array(EntryLite).default([]),
        compare_entries: z.array(EntryLite).default([]),
        window_label: z.string().default("this month"),
        compare_label: z.string().default("previous period"),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    if (!data.entries.length) {
      return {
        metrics: METRICS.map((m) => ({
          key: m.key,
          score: 0,
          trend: "steady" as const,
          delta_pct: 0,
          evidence: "Not enough entries yet.",
        })),
        summary:
          "ALIVE needs more entries to see who you are becoming. Keep showing up.",
      };
    }

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const fmt = (arr: typeof data.entries) =>
      arr
        .slice(0, 40)
        .map(
          (e) =>
            `[${e.date}] focus=${e.focus_word ?? "-"} one=${e.one_thing ?? "-"} mood=${e.mood_label ?? "-"}\n  ${(e.content ?? "").slice(0, 300)}`
        )
        .join("\n\n");

    const prompt = `You are analyzing identity growth across a person's diary entries.

WINDOW (${data.window_label}):
${fmt(data.entries)}

COMPARISON (${data.compare_label}):
${data.compare_entries.length ? fmt(data.compare_entries) : "(no entries in this window)"}

For each of these 8 identity metrics: discipline, gratitude, self_awareness, relationships, spiritual_growth, resilience, purpose, learning — return:
- score: 0-100 for the current window
- trend: "up" | "down" | "steady" vs the comparison window
- delta_pct: estimated percent change vs comparison (positive or negative integer)
- evidence: one short sentence quoting or paraphrasing real signals from entries (e.g. "Mentions of meaningful relationships have doubled since March.")

Then write a 2-sentence summary describing who they are becoming.`;

    try {
      const { experimental_output } = await generateText({
        model,
        system:
          "You are ALIVE — a thoughtful identity-pattern analyst. Be specific, honest, grounded in the actual entries. Never generic.",
        prompt,
        experimental_output: Output.object({ schema: Schema }),
      });
      return experimental_output;
    } catch (err) {
      console.error("[becoming] AI error", err);
      return {
        metrics: METRICS.map((m) => ({
          key: m.key,
          score: 50,
          trend: "steady" as const,
          delta_pct: 0,
          evidence: "Still gathering signal.",
        })),
        summary: "Your identity is quietly forming. Keep capturing.",
      };
    }
  });
