import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { OwnAiSchema } from "@/lib/ai-schema";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  ai: OwnAiSchema,
  // Decrypted on the device and sent for this one request; never stored.
  momentText: z.string().min(1).max(20000),
  capturedAt: z.string(),
  existingThreads: z
    .array(z.object({ id: z.string(), title: z.string(), kind: z.string() }))
    .max(80),
  existingIntentions: z.array(z.object({ id: z.string(), title: z.string() })).max(40),
});

const Schema = z.object({
  threads: z.array(
    z.object({
      existingId: z.string().nullable(),
      title: z.string(),
      kind: z.enum(["worry", "project", "person", "idea", "hope"]),
      quote: z.string(),
    }),
  ),
  intentions: z.array(
    z.object({ existingId: z.string().nullable(), title: z.string(), quote: z.string() }),
  ),
  area: z.enum(["work", "life"]),
});

const SYSTEM = `You are reading one moment from a person's diary and filing it. Return only what is actually present in their words.

For each ongoing situation the moment touches, return a thread. Match an existing thread by id when the moment is clearly about the same situation — prefer matching over creating. Only create a new thread when nothing existing fits.

A thread is something alive in their life: a worry, a project, a person, an idea, a hope. It is never a task and never has a deadline. Do not create threads for one-off events with no continuation.

Separately, return intentions: things the person says they mean to do ("I need to…", "I'll…", "next week I want to…"). Match an existing intention by id when this moment mentions it again, including saying they did it. Never invent an intention they did not state.

Every thread and intention must include a verbatim quote from the moment — the exact words, copied, not paraphrased. If you cannot quote it exactly, do not return it.

Be conservative. Missing a thread is much better than inventing one. Returning zero threads and zero intentions is a valid and common answer.

Do not infer anything about health, diagnoses or medical conditions. Do not speculate about anything the person did not say.

Also set area: "work" if the moment is mainly about their job, business or studies, otherwise "life".`;

export const extractFromMoment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { modelFor } = await import("./ai-router.server");
    // A fast, cheap model: this runs on every capture.
    const model = await modelFor({
      own: data.ai,
      supabase: context.supabase,
      userId: context.userId,
      cloudModel: "google/gemini-2.5-flash",
    });
    const threads = data.existingThreads.map((t) => `- ${t.id}: ${t.title} (${t.kind})`).join("\n");
    const intentions = data.existingIntentions.map((i) => `- ${i.id}: ${i.title}`).join("\n");
    const { experimental_output } = await generateText({
      model,
      system: SYSTEM,
      prompt: `Existing threads:\n${threads || "(none)"}\n\nExisting intentions:\n${intentions || "(none)"}\n\nMoment captured ${data.capturedAt}:\n"""\n${data.momentText}\n"""`,
      experimental_output: Output.object({ schema: Schema }),
    });
    return experimental_output;
  });
