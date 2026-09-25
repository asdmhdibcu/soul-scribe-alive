import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateExtraction,
  nextThreadState,
  isQuiet,
  THREAD_KINDS,
} from "../src/lib/sorting-model.ts";

const text = "Worried about the Hamza project again. I need to call the bank before Friday.";
const existing = [{ id: "t1", title: "Hamza project", kind: "project" }];

test("keeps only topics whose quote is copied word for word from the moment", () => {
  const r = validateExtraction(
    {
      threads: [
        {
          existingId: "t1",
          title: "Hamza project",
          kind: "project",
          quote: "Worried about the Hamza project again.",
        },
        {
          existingId: null,
          title: "Stress",
          kind: "worry",
          quote: "I feel stressed about everything",
        },
      ],
      intentions: [],
      area: "work",
    },
    text,
    existing,
  );
  assert.deepEqual(
    r.threads.map((t) => t.title),
    ["Hamza project"],
  );
  assert.equal(r.dropped, 1);
});

test("matching an existing topic only works for ids that really exist", () => {
  const r = validateExtraction(
    {
      threads: [{ existingId: "nope", title: "Bank", kind: "worry", quote: "call the bank" }],
      intentions: [],
      area: "life",
    },
    text,
    existing,
  );
  assert.equal(r.threads[0].existingId, null);
});

test("unknown kinds are dropped; tasks are never a topic kind", () => {
  assert.deepEqual([...THREAD_KINDS], ["worry", "project", "person", "idea", "hope"]);
  const r = validateExtraction(
    {
      threads: [{ existingId: null, title: "Bank", kind: "task", quote: "call the bank" }],
      intentions: [],
      area: "life",
    },
    text,
    existing,
  );
  assert.equal(r.threads.length, 0);
});

test("intentions keep the exact words; paraphrases are dropped", () => {
  const r = validateExtraction(
    {
      threads: [],
      intentions: [
        {
          existingId: null,
          title: "Call the bank",
          quote: "I need to call the bank before Friday.",
        },
        { existingId: null, title: "Gym", quote: "I will go to the gym" },
      ],
      area: "life",
    },
    text,
    existing,
  );
  assert.deepEqual(
    r.intentions.map((i) => i.quote),
    ["I need to call the bank before Friday."],
  );
});

test("work or life tag falls back to life when the model says anything else", () => {
  assert.equal(
    validateExtraction({ threads: [], intentions: [], area: "work" }, text, []).area,
    "work",
  );
  assert.equal(
    validateExtraction({ threads: [], intentions: [], area: "health" }, text, []).area,
    "life",
  );
});

test("a new mention warms the topic and counts once more", () => {
  assert.deepEqual(
    nextThreadState(
      { last_seen: "2026-09-01T00:00:00Z", mention_count: 1 },
      "2026-09-20T09:00:00Z",
    ),
    { last_seen: "2026-09-20T09:00:00Z", mention_count: 2, state: "warm" },
  );
  // An older imported moment doesn't move last_seen backwards.
  assert.equal(
    nextThreadState({ last_seen: "2026-09-20T00:00:00Z", mention_count: 3 }, "2026-08-01T00:00:00Z")
      .last_seen,
    "2026-09-20T00:00:00Z",
  );
});

test("a topic goes quiet after 14 days without a mention", () => {
  const now = new Date("2026-09-25T00:00:00Z");
  assert.equal(isQuiet("2026-09-10T00:00:00Z", now), true);
  assert.equal(isQuiet("2026-09-12T00:00:00Z", now), false);
});
