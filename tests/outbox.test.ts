import { test } from "node:test";
import assert from "node:assert/strict";
import { flushOutbox, type OutboxItem, type OutboxStore } from "../src/lib/outbox-model.ts";

function memoryStore(items: OutboxItem[]): OutboxStore & { items: OutboxItem[] } {
  const s = {
    items: [...items],
    all: async () => [...s.items],
    remove: async (id: string) => {
      s.items = s.items.filter((i) => i.id !== id);
    },
  };
  return s;
}

const cap = (id: string, at: string): OutboxItem => ({
  id,
  type: "capture",
  queuedAt: at,
  payload: {},
});
const tr = (id: string, at: string): OutboxItem => ({
  id,
  type: "transcript",
  queuedAt: at,
  payload: {},
});

test("sends queued items oldest first and removes each once it's stored", async () => {
  const store = memoryStore([cap("b", "2026-09-25T10:02:00Z"), cap("a", "2026-09-25T10:01:00Z")]);
  const sent: string[] = [];
  const r = await flushOutbox(store, async (i) => void sent.push(i.id));
  assert.deepEqual(sent, ["a", "b"]);
  assert.deepEqual(r, { sent: 2, remaining: 0 });
  assert.equal(store.items.length, 0);
});

test("stops at the first failure and keeps everything not yet sent", async () => {
  const store = memoryStore([
    cap("a", "2026-09-25T10:01:00Z"),
    tr("a-text", "2026-09-25T10:01:30Z"),
    cap("b", "2026-09-25T10:02:00Z"),
  ]);
  const r = await flushOutbox(store, async (i) => {
    if (i.id === "a-text") throw new Error("offline");
  });
  assert.deepEqual(r, { sent: 1, remaining: 2 });
  assert.deepEqual(
    store.items.map((i) => i.id),
    ["a-text", "b"],
  );
});

test("a transcript is never sent before its moment", async () => {
  const store = memoryStore([
    tr("m1-text", "2026-09-25T10:05:00Z"),
    cap("m1", "2026-09-25T10:04:00Z"),
  ]);
  const sent: string[] = [];
  await flushOutbox(store, async (i) => void sent.push(i.id));
  assert.deepEqual(sent, ["m1", "m1-text"]);
});

test("an empty outbox is a no-op", async () => {
  assert.deepEqual(await flushOutbox(memoryStore([]), async () => {}), { sent: 0, remaining: 0 });
});
