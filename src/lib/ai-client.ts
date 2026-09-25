import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  decryptField,
  encryptField,
  hasMasterKey,
  isDecryptFailure,
  onMasterKeyChange,
} from "@/lib/crypto";
import { AI_PROVIDERS, type AiProvider, type OwnAi } from "@/lib/ai-model";
import { usePlan } from "@/lib/plan";

/** The person's own AI key, decrypted on this device; cached for the tab. */
let cached: OwnAi | null | undefined;
export const AI_SETTINGS_CHANGED = "alive:ai-settings-changed";

// Forget the decrypted key when the diary locks or someone signs out.
if (typeof window !== "undefined") {
  onMasterKeyChange(() => {
    if (!hasMasterKey()) cached = undefined;
  });
}

export async function loadOwnAi(): Promise<OwnAi | undefined> {
  if (cached !== undefined) return cached ?? undefined;
  const { data } = await supabase
    .from("user_prefs")
    .select("ai_provider, ai_model, ai_key_enc")
    .maybeSingle();
  if (!data?.ai_key_enc || !data.ai_provider || !(data.ai_provider in AI_PROVIDERS)) {
    cached = null;
    return undefined;
  }
  const apiKey = await decryptField(data.ai_key_enc);
  cached = isDecryptFailure(apiKey)
    ? null
    : {
        provider: data.ai_provider as AiProvider,
        model: data.ai_model || AI_PROVIDERS[data.ai_provider as AiProvider].defaultModel,
        apiKey,
      };
  return cached ?? undefined;
}

export async function saveOwnAi(ai: OwnAi) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("user_prefs").upsert(
    {
      user_id: u.user.id,
      ai_provider: ai.provider,
      ai_model: ai.model.trim(),
      ai_key_enc: await encryptField(ai.apiKey.trim()),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  cached = { ...ai, model: ai.model.trim(), apiKey: ai.apiKey.trim() };
  window.dispatchEvent(new Event(AI_SETTINGS_CHANGED));
}

export async function removeOwnAi() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("user_prefs")
    .update({ ai_provider: null, ai_model: null, ai_key_enc: null })
    .eq("user_id", u.user.id);
  if (error) throw error;
  cached = null;
  window.dispatchEvent(new Event(AI_SETTINGS_CHANGED));
}

/**
 * Whether AI features are available: a paid plan, or the person's own key.
 * Free users with a key get every AI feature.
 */
export function useAiAccess() {
  const { plan, loading: planLoading } = usePlan();
  const [ownKey, setOwnKey] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () =>
      void loadOwnAi()
        .then((a) => setOwnKey(Boolean(a)))
        .catch(() => setOwnKey(false));
    check();
    window.addEventListener(AI_SETTINGS_CHANGED, check);
    return () => window.removeEventListener(AI_SETTINGS_CHANGED, check);
  }, []);
  const paid = Boolean(plan && plan !== "free");
  return {
    loading: planLoading || ownKey === null,
    hasAi: paid || Boolean(ownKey),
    ownKey: Boolean(ownKey),
    plan,
  };
}
