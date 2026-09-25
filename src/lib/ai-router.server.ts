import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_NEEDS_KEY, resolveAi, type OwnAi } from "@/lib/ai-model";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

/**
 * Picks the model for one request: the person's own key if they sent one,
 * Alive's cloud account on a paid plan, otherwise AI_NEEDS_KEY. The plan is
 * read server-side so the cloud account can't be used by a free account.
 */
export async function modelFor(opts: {
  own: OwnAi | undefined;
  supabase: SupabaseClient;
  userId: string;
  cloudModel: string;
}) {
  const { data } = await opts.supabase
    .from("users")
    .select("plan")
    .eq("id", opts.userId)
    .maybeSingle();
  const route = resolveAi(opts.own, (data?.plan as string | undefined) ?? "free");
  if (route.source === "none") throw new Error(AI_NEEDS_KEY);
  if (route.source === "own") {
    return createOpenAICompatible({
      name: route.provider,
      baseURL: route.baseURL,
      apiKey: route.apiKey,
    })(route.model);
  }
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)(opts.cloudModel);
}
