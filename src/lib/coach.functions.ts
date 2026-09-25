import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { OwnAiSchema } from "@/lib/ai-schema";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Decrypted on the device and sent for this one request; never stored.
const Input = z.object({
  ai: OwnAiSchema,
  max: z.number().int().min(1).max(5),
  said: z
    .array(
      z.object({
        title: z.string(),
        kind: z.string(),
        quotes: z.array(z.object({ date: z.string(), quote: z.string() })),
      }),
    )
    .max(40),
  recentDays: z.array(z.object({ date: z.string(), text: z.string() })).max(200),
});

const Schema = z.object({
  suggestions: z.array(z.object({ text: z.string(), citedDate: z.string(), quote: z.string() })),
});

const SYSTEM = `You are a coach the person has chosen to open. You help them act on what they themselves said they want. You are not their manager.

Rules, all absolute:

Every suggestion must quote their own words and name the date they said them (citedDate = YYYY-MM-DD of that entry; quote copied exactly).

Build only on goals, hopes and intentions they actually stated. Never invent a goal.

Never ask whether they did something. No questions at all. No guilt, no pressure, no streaks, no "you should have".

Never predict how a future day will feel. Never mention health, the body, diagnoses or medical conditions.

Be concrete and small: one practical next step each, drawn from what their own entries show (times, people, places they mentioned). Plain, warm, short.

Return at most the number of suggestions asked for. Returning none is fine when nothing they said supports a suggestion.`;

export const generateCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { modelFor } = await import("./ai-router.server");
    const model = await modelFor({
      own: data.ai,
      supabase: context.supabase,
      userId: context.userId,
      cloudModel: "google/gemini-2.5-flash",
    });
    const said = data.said
      .map(
        (t) =>
          `- ${t.title} (${t.kind}): ${t.quotes.map((q) => `[${q.date}] "${q.quote}"`).join(" ")}`,
      )
      .join("\n");
    const recent = data.recentDays.map((d) => `[${d.date}] ${d.text.slice(0, 600)}`).join("\n\n");
    const { experimental_output } = await generateText({
      model,
      system: SYSTEM,
      prompt: `Up to ${data.max} suggestion(s).\n\nWhat they said they want or intend:\n${said || "(nothing yet)"}\n\nTheir last 14 days:\n${recent || "(nothing)"}`,
      experimental_output: Output.object({ schema: Schema }),
    });
    return experimental_output;
  });
