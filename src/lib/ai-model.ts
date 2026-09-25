/**
 * Which AI runs a request. Pure rules, no imports; tested directly.
 * - The person's own key (bring your own) always wins, on any plan.
 * - Paid plans without a key use Alive's cloud account.
 * - Free plan without a key: AI features are unavailable, with a clear message.
 */

export const AI_NEEDS_KEY = "AI_NEEDS_KEY";

export const AI_PROVIDERS = {
  openai: { label: "OpenAI", baseURL: "https://api.openai.com/v1", defaultModel: "gpt-4.1-mini" },
  anthropic: {
    label: "Anthropic",
    baseURL: "https://api.anthropic.com/v1/",
    defaultModel: "claude-haiku-4-5",
  },
  google: {
    label: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.5-flash",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;
export type OwnAi = { provider: AiProvider; model: string; apiKey: string };

export type AiRoute =
  | { source: "own"; provider: AiProvider; model: string; apiKey: string; baseURL: string }
  | { source: "cloud" }
  | { source: "none"; reason: typeof AI_NEEDS_KEY };

export function resolveAi(own: OwnAi | undefined | null, plan: string | null | undefined): AiRoute {
  if (own && own.apiKey.trim() && own.model.trim() && own.provider in AI_PROVIDERS) {
    return {
      source: "own",
      provider: own.provider,
      model: own.model.trim(),
      apiKey: own.apiKey.trim(),
      baseURL: AI_PROVIDERS[own.provider].baseURL,
    };
  }
  if (plan && plan !== "free") return { source: "cloud" };
  return { source: "none", reason: AI_NEEDS_KEY };
}

export function redactKey(key: string) {
  return `••••${key.trim().slice(-4)}`;
}

/** Plain message for the UI when a request came back needing a key. */
export function aiErrorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes(AI_NEEDS_KEY)) {
    return "This needs AI. Add your own AI key in Settings (free), or upgrade to Soul.";
  }
  return "The AI didn't answer. Try again in a moment.";
}
