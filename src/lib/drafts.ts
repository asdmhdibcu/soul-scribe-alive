import { supabase } from "@/integrations/supabase/client";

export type DraftStep = "mood" | "cards" | "memory" | "question";

export type DraftRow = {
  current_step: DraftStep;
  mood_data: { x: number; y: number; color: string; label: string } | null;
  spark_cards: unknown[] | null;
  photos: string[] | null;
  voice_transcript: string | null;
  one_sentence: string | null;
  one_question_answer: { question: string; answer_text: string } | null;
  updated_at: string;
};

export async function loadDraft(): Promise<DraftRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("draft_sessions")
    .select(
      "current_step, mood_data, spark_cards, photos, voice_transcript, one_sentence, one_question_answer, updated_at",
    )
    .eq("user_id", u.user.id)
    .maybeSingle();
  return (data as DraftRow | null) ?? null;
}

export async function saveDraft(payload: Partial<Omit<DraftRow, "updated_at">>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const row = { user_id: u.user.id, ...payload } as Record<string, unknown>;
  await supabase
    .from("draft_sessions")
    .upsert(row as never, { onConflict: "user_id" });
}

/** Best-effort flush during pagehide/beforeunload. */
export function flushDraftBeacon(payload: Partial<Omit<DraftRow, "updated_at">> & { user_id: string }) {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/draft_sessions?on_conflict=user_id`;
    const blob = new Blob(
      [JSON.stringify({ ...payload })],
      { type: "application/json" },
    );
    // sendBeacon can't set custom headers, so fall back to keepalive fetch.
    void fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${getAccessTokenSync() ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: blob,
    });
  } catch {
    /* ignore */
  }
}

function getAccessTokenSync(): string | null {
  try {
    const raw = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (!raw) return null;
    const parsed = JSON.parse(localStorage.getItem(raw) ?? "null");
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function clearDraft() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("draft_sessions").delete().eq("user_id", u.user.id);
}
