import { supabase } from "@/integrations/supabase/client";
import { decryptField, encryptField, hasMasterKey, isDecryptFailure } from "@/lib/crypto";
import { loadOwnAi } from "@/lib/ai-client";
import { extractFromMoment } from "@/lib/extraction.functions";
import { nextThreadState, QUIET_AFTER_DAYS, validateExtraction } from "@/lib/sorting-model";

/**
 * The silent filing pass. Runs in the background after captures and on app
 * open: each unsorted moment with text is sent (decrypted, for that one
 * request) to the AI, the answer is checked word for word against the
 * moment, and threads are stored encrypted. It never blocks capture.
 */

export const THREADS_CHANGED_EVENT = "alive:threads-changed";

export type Thread = {
  id: string;
  title: string;
  kind: string;
  state: "warm" | "quiet";
  hidden: boolean;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
};

async function open(v: string | null | undefined) {
  if (!v) return "";
  const t = await decryptField(v);
  return isDecryptFailure(t) ? "" : t;
}

/** All threads and intentions, decrypted on this device. */
export async function loadThreads(): Promise<Thread[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title_enc, kind_enc, state, hidden, first_seen, last_seen, mention_count")
    .order("last_seen", { ascending: false })
    .limit(300);
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (r) => ({
      id: r.id,
      title: await open(r.title_enc),
      kind: await open(r.kind_enc),
      state: r.state as "warm" | "quiet",
      hidden: Boolean((r as { hidden?: boolean }).hidden),
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      mentionCount: r.mention_count,
    })),
  );
}

/** Marks threads quiet after 14 days without a mention. */
export async function markQuietThreads() {
  const cutoff = new Date(Date.now() - QUIET_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("threads")
    .update({ state: "quiet" })
    .eq("state", "warm")
    .lt("last_seen", cutoff);
}

async function fileOne(
  row: { id: string; user_id: string; captured_at: string; body_enc: string | null },
  extraText: string,
  threads: Thread[],
) {
  const own = await loadOwnAi();
  const momentText = [await open(row.body_enc), extraText].filter(Boolean).join("\n\n");
  if (!momentText.trim()) return;

  const topics = threads.filter((t) => t.kind !== "intention");
  const intentions = threads.filter((t) => t.kind === "intention" && !t.hidden);
  const raw = await extractFromMoment({
    data: {
      ai: own,
      momentText: momentText.slice(0, 20000),
      capturedAt: row.captured_at,
      existingThreads: topics.slice(0, 80).map((t) => ({ id: t.id, title: t.title, kind: t.kind })),
      existingIntentions: intentions.slice(0, 40).map((t) => ({ id: t.id, title: t.title })),
    },
  });
  const checked = validateExtraction(raw, momentText, threads);
  if (checked.dropped) console.info(`[sorter] dropped ${checked.dropped} unquoted item(s)`);

  const items = [
    ...checked.threads.map((t) => ({ ...t, kindLabel: t.kind as string })),
    ...checked.intentions.map((i) => ({ ...i, kindLabel: "intention" })),
  ];
  for (const item of items) {
    let threadId = item.existingId;
    const current = threadId ? threads.find((t) => t.id === threadId) : undefined;
    if (current) {
      const next = nextThreadState(
        { last_seen: current.lastSeen, mention_count: current.mentionCount },
        row.captured_at,
      );
      const { error } = await supabase.from("threads").update(next).eq("id", current.id);
      if (error) throw error;
      current.lastSeen = next.last_seen;
      current.mentionCount = next.mention_count;
    } else {
      const { data, error } = await supabase
        .from("threads")
        .insert({
          user_id: row.user_id,
          title_enc: await encryptField(item.title),
          kind_enc: await encryptField(item.kindLabel),
          state: "warm",
          first_seen: row.captured_at,
          last_seen: row.captured_at,
          mention_count: 1,
        })
        .select("id")
        .single();
      if (error) throw error;
      threadId = data.id;
      threads.push({
        id: data.id,
        title: item.title,
        kind: item.kindLabel,
        state: "warm",
        hidden: false,
        firstSeen: row.captured_at,
        lastSeen: row.captured_at,
        mentionCount: 1,
      });
    }
    const { error: mErr } = await supabase.from("thread_mentions").insert({
      thread_id: threadId!,
      moment_id: row.id,
      user_id: row.user_id,
      captured_at: row.captured_at,
      quote_enc: await encryptField(item.quote),
    });
    if (mErr) throw mErr;
  }

  const { error } = await supabase
    .from("moments")
    .update({ sorted_at: new Date().toISOString(), area_enc: await encryptField(checked.area) })
    .eq("id", row.id);
  if (error) throw error;
}

let running: Promise<void> | null = null;

/**
 * Files unsorted moments, oldest first, a few at a time. Skips quietly when
 * the diary is locked or no AI is available (no own key and a free plan).
 */
export function sortPending(limit = 8) {
  if (running) return running;
  running = (async () => {
    if (!hasMasterKey()) return;
    await markQuietThreads().catch(() => {});
    const { data } = await supabase
      .from("moments")
      .select("id, user_id, captured_at, kind, body_enc, moment_files(text_enc)")
      .is("sorted_at", null)
      // Moments with text, or files that may have text. Voice notes wait for
      // their transcript (body_enc), so they never block this queue.
      .or("body_enc.not.is.null,kind.eq.file")
      .order("captured_at", { ascending: true })
      .limit(limit);
    const rows = (data ?? []) as {
      id: string;
      user_id: string;
      captured_at: string;
      kind: string;
      body_enc: string | null;
      moment_files?: { text_enc?: string | null }[] | null;
    }[];
    if (!rows.length) return;
    const threads = await loadThreads();
    let changed = false;
    for (const row of rows) {
      const fileText = (
        await Promise.all((row.moment_files ?? []).map((f) => open(f.text_enc ?? null)))
      )
        .filter(Boolean)
        .join("\n\n");
      if (!row.body_enc && !fileText) {
        // A file with no readable text (e.g. an image-only PDF): nothing to file.
        await supabase
          .from("moments")
          .update({ sorted_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }
      try {
        await fileOne(row, fileText, threads);
        changed = true;
      } catch (e) {
        // No AI available, or a network error: leave it unsorted and try later.
        console.info("[sorter] stopped:", e instanceof Error ? e.message : e);
        break;
      }
    }
    if (changed) window.dispatchEvent(new Event(THREADS_CHANGED_EVENT));
  })().finally(() => {
    running = null;
  });
  return running;
}
