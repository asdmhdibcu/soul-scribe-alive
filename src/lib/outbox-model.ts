/**
 * The on-device outbox. Every capture goes here first (already encrypted),
 * then uploads; offline, items simply wait. Pure logic, tested directly.
 */

export type OutboxItem = {
  id: string;
  type: "capture" | "transcript";
  /** ISO time the item was queued; items send oldest first. */
  queuedAt: string;
  payload: unknown;
};

export type OutboxStore = {
  all(): Promise<OutboxItem[]>;
  remove(id: string): Promise<void>;
};

/**
 * Sends items oldest first. Stops at the first failure so order is kept
 * (a transcript never lands before its moment); unsent items stay queued.
 */
export async function flushOutbox(
  store: OutboxStore,
  send: (item: OutboxItem) => Promise<void>,
): Promise<{ sent: number; remaining: number }> {
  const items = (await store.all()).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  let sent = 0;
  for (const item of items) {
    try {
      await send(item);
    } catch {
      break;
    }
    await store.remove(item.id);
    sent++;
  }
  return { sent, remaining: items.length - sent };
}
