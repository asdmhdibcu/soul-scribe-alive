import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Entry = z.object({
  date: z.string(),
  title: z.string().nullable(),
  content: z.string().nullable(),
  mood_label: z.string().nullable().optional(),
});

const Input = z.object({
  question: z.string().min(1).max(500),
  entries: z.array(Entry).max(120),
});

const SYSTEM = `You are ALIVE — the user's personal historian.

You have access to their diary entries. Answer their question about themselves with WARMTH, SPECIFICITY, and CITATIONS.

Rules:
- Cite specific dates when possible ("On June 5th, you wrote...")
- Quote a short phrase from the entry when it adds power
- 2-4 sentences. Concise. No preamble.
- If no entries match, say so honestly: "I don't see that in your pages yet."
- Never invent events. Only use what's in the entries.
- Speak in second person ("you"). Warm, intelligent, never clinical.`;

export const askMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");

    const corpus = data.entries
      .slice(0, 120)
      .map(
        (e) =>
          `[${e.date}] ${e.title ?? "(untitled)"}${e.mood_label ? ` — mood: ${e.mood_label}` : ""}\n${(e.content ?? "").slice(0, 1200)}`,
      )
      .join("\n\n---\n\n");

    try {
      const result = await generateText({
        model,
        system: SYSTEM,
        prompt: `Their question: "${data.question}"\n\nTheir diary entries:\n\n${corpus || "(no entries yet)"}\n\nAnswer.`,
      });
      return { answer: result.text.trim() };
    } catch (err) {
      console.error("[memory] AI error", err);
      return { answer: "I couldn't read your pages right now. Try again in a moment." };
    }
  });
