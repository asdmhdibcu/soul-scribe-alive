import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const Card = z.object({
  card: z.string(),
  swipe: z.enum(["right", "left", "up", "down"]),
});

const Input = z.object({
  name: z.string().default("friend"),
  mood_x: z.number(),
  mood_y: z.number(),
  mood_label: z.string(),
  mood_color: z.string(),
  cards: z.array(Card).default([]),
  one_sentence: z.string().default(""),
  voice_transcript: z.string().default(""),
  has_photo: z.boolean().default(false),
  question: z.string().default(""),
  answer: z.string().default(""),
  ai_tone: z.string().nullable().optional(),
});

const DiarySchema = z.object({
  title: z.string(),
  content: z.string(),
  mood_label: z.string(),
  mood_emoji: z.string(),
  ai_insight: z.string(),
  focus_word: z.string(),
  one_thing: z.string(),
  energy_forecast: z.string(),
  relationship_nudge: z.string().nullable(),
  body_signal: z.string().nullable(),
  morning_mission: z.string(),
  tonight_intention: z.string(),
  coins_earned: z.number(),
});

export type DiaryResult = z.infer<typeof DiarySchema>;

const SYSTEM = `You are ALIVE — a master literary diary writer.

Write in first person as the user. Style: emotionally rich, honest, specific, literary but not pretentious. 3-4 paragraphs.

Use the exact emotions and situations they described. Make them feel deeply seen. Do NOT use generic motivational language or self-help clichés.

Write as if this is the most honest thing they've ever written.

Return ONLY the structured JSON with these fields:
- title: powerful 5-7 word title
- content: full 3-4 paragraph diary entry, first person
- mood_label: one evocative word
- mood_emoji: one emoji
- ai_insight: one sharp observation about a pattern (max 25 words)
- focus_word: one word for tomorrow
- one_thing: most important action for tomorrow (one sentence)
- energy_forecast: 2 sentence prediction for tomorrow
- relationship_nudge: observation about relationships if relevant, otherwise null
- body_signal: health/body observation if relevant, otherwise null
- morning_mission: short morning ritual sentence
- tonight_intention: short sentence for tonight before sleep
- coins_earned: integer between 10 and 25 reflecting session depth`;

export const generateDiary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-pro");

    const up = data.cards.filter((c) => c.swipe === "up").map((c) => c.card);
    const down = data.cards.filter((c) => c.swipe === "down").map((c) => c.card);
    const right = data.cards.filter((c) => c.swipe === "right").map((c) => c.card);

    const ctx: string[] = [];
    ctx.push(`User name: ${data.name}`);
    ctx.push(`Mood word: "${data.mood_label}" (x=${data.mood_x.toFixed(2)} where +x is alive, y=${data.mood_y.toFixed(2)} where +y is bright)`);
    if (up.length) ctx.push(`Felt MAJOR today: ${up.join("; ")}`);
    if (down.length) ctx.push(`Hurt them today: ${down.join("; ")}`);
    if (right.length) ctx.push(`Also true today: ${right.slice(0, 8).join("; ")}`);
    if (data.one_sentence) ctx.push(`One sentence they wrote: "${data.one_sentence}"`);
    if (data.voice_transcript) ctx.push(`They said aloud: "${data.voice_transcript}"`);
    if (data.has_photo) ctx.push(`They shared a photo of today.`);
    if (data.question && data.answer) {
      ctx.push(`We asked them: "${data.question}"`);
      ctx.push(`They answered: "${data.answer}"`);
    }
    if (data.ai_tone) ctx.push(`Tone preference: ${data.ai_tone}`);

    try {
      const result = await generateText({
        model,
        system: SYSTEM,
        prompt: `Here is everything they shared today:\n\n${ctx.join("\n")}\n\nWrite their diary entry now.`,
        experimental_output: Output.object({ schema: DiarySchema }),
      });
      return result.experimental_output as DiaryResult;
    } catch (err) {
      console.error("[diary] AI error", err);
      const fallback: DiaryResult = {
        title: "A Day That Asked Something Of Me",
        content: `Today landed in a way that's hard to name. ${data.one_sentence || data.answer || "There was weight, and there was light."}\n\nI felt ${data.mood_label.toLowerCase()} — not because of one thing, but because of the way things stacked. The small frictions, the unexpected softness, the slow becoming.\n\nI'm not sure what tomorrow will ask, but I know today already asked something of me. And I answered, even if quietly.`,
        mood_label: data.mood_label,
        mood_emoji: "✨",
        ai_insight: "You name your feelings carefully. That is itself a form of self-respect.",
        focus_word: "Presence",
        one_thing: "Begin tomorrow with one small thing done before the noise begins.",
        energy_forecast: "Tomorrow may feel slower than today. Use that softness.",
        relationship_nudge: null,
        body_signal: null,
        morning_mission: "Two minutes of stillness before reaching for your phone.",
        tonight_intention: "Let today rest. You did enough.",
        coins_earned: 12,
      };
      return fallback;
    }
  });
