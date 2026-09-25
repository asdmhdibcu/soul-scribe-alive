import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { OwnAiSchema } from "@/lib/ai-schema";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Everything below is decrypted on the device and sent for this one request.
const Input = z.object({
  ai: OwnAiSchema,
  threads: z
    .array(
      z.object({
        title: z.string(),
        kind: z.string(),
        latestQuote: z.string(),
        latestDate: z.string(),
      }),
    )
    .max(40),
  recentDays: z.array(z.object({ date: z.string(), text: z.string() })).max(200),
  echoes: z.array(z.object({ date: z.string(), text: z.string() })).max(20),
});

const Schema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["thread", "pattern", "echo"]),
      text: z.string(),
      citedDate: z.string(),
      quote: z.string(),
    }),
  ),
});

const SYSTEM = `You write a short morning brief from a person's own diary. You are handing them what is alive in their life. You are not their manager.

Rules, all absolute:

Never ask whether they did something. No "did you", no "have you", no question marks about their follow-through.

Never give advice, encouragement or motivational language.

Every item must quote their own words and name the date they said them.

If you cannot cite it, do not include it.

Never predict. "You have been flat on Mondays for three weeks" is good. "Tomorrow may feel slower" is forbidden.

Never mention health, diagnoses or medical conditions.

Two to five items. Plain, warm, short. No preamble, no sign-off.

citedDate must be the YYYY-MM-DD date of the entry the quote comes from, and quote must be copied exactly from that entry.`;

export const generateBrief = createServerFn({ method: "POST" })
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
    const threads = data.threads
      .map((t) => `- ${t.title} (${t.kind}); latest on ${t.latestDate}: "${t.latestQuote}"`)
      .join("\n");
    const recent = data.recentDays.map((d) => `[${d.date}] ${d.text.slice(0, 800)}`).join("\n\n");
    const echoes = data.echoes.map((d) => `[${d.date}] ${d.text.slice(0, 800)}`).join("\n\n");
    const { experimental_output } = await generateText({
      model,
      system: SYSTEM,
      prompt: `What is alive (warm threads and intentions):\n${threads || "(none)"}\n\nThe last 14 days:\n${recent || "(nothing)"}\n\nExactly one year ago:\n${echoes || "(nothing)"}`,
      experimental_output: Output.object({ schema: Schema }),
    });
    return experimental_output;
  });
