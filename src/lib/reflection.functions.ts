import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const Input = z.object({
  mood_x: z.number(),
  mood_y: z.number(),
  mood_label: z.string(),
  cards_up: z.array(z.string()).default([]),
  cards_down: z.array(z.string()).default([]),
  cards_right: z.array(z.string()).default([]),
  one_sentence: z.string().default(""),
  has_photo: z.boolean().default(false),
  has_voice: z.boolean().default(false),
  ai_tone: z.string().nullable().optional(),
});

const SYSTEM = `You are ALIVE, a deeply empathetic AI diary companion.

Based on the user's mood data and what they shared today, ask ONE single powerful question that cuts through the surface and reaches what really matters.

The question should feel like it comes from someone who truly knows them.

Maximum 2 sentences. No preamble. No greeting. Just the question itself.

Make it feel like a mirror — not a coach, not a therapist. A question that surprises them with how seen they feel.`;

export const generateReflectionQuestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const toneMap: Record<string, string> = {
      coach: "Direct. Challenge them to grow. Don't accept easy answers.",
      friend: "Warm and tender. Make them feel safe.",
      mirror: "Quietly reflective. Just show them themselves.",
      guide: "Connect today to something bigger — meaning, faith, legacy.",
      motivator: "Bold and energizing. Remind them of their power.",
    };
    const toneNote = data.ai_tone ? toneMap[data.ai_tone] ?? "" : "";

    const ctxLines: string[] = [];
    ctxLines.push(`Mood: "${data.mood_label}" (x=${data.mood_x.toFixed(2)}, y=${data.mood_y.toFixed(2)} where +x = alive, +y = bright)`);
    if (data.cards_up.length) ctxLines.push(`Felt MAJOR today: ${data.cards_up.join("; ")}`);
    if (data.cards_down.length) ctxLines.push(`Hurt or bothered them: ${data.cards_down.join("; ")}`);
    if (data.cards_right.length) ctxLines.push(`Also happened: ${data.cards_right.slice(0, 6).join("; ")}`);
    if (data.one_sentence) ctxLines.push(`One sentence they wrote: "${data.one_sentence}"`);
    if (data.has_photo) ctxLines.push(`They shared a photo of today.`);
    if (data.has_voice) ctxLines.push(`They recorded a voice memory.`);
    if (toneNote) ctxLines.push(`Tone preference: ${toneNote}`);

    try {
      const result = await generateText({
        model,
        system: SYSTEM,
        prompt: `Here is what they shared today:\n\n${ctxLines.join("\n")}\n\nAsk the one question.`,
      });
      const question = result.text.trim().replace(/^["“”']+|["“”']+$/g, "");
      return { question };
    } catch (err) {
      console.error("[reflection] AI error", err);
      // Graceful fallback
      return {
        question:
          "When you think about today, what is the part of yourself you're trying not to look at?",
      };
    }
  });
