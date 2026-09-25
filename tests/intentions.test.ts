import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeThread } from "../src/lib/sorting-model.ts";

const mentions = [
  { capturedAt: "2026-09-18T20:00:00Z", quote: "called the bank today" },
  { capturedAt: "2026-09-12T09:00:00Z", quote: "I need to call the bank before Friday." },
  { capturedAt: "2026-09-15T12:00:00Z", quote: "still haven't rung the bank" },
];

test("an intention shows what was said first, with its date", () => {
  const s = summarizeThread(mentions);
  assert.deepEqual(s.first, { day: "2026-09-12", quote: "I need to call the bank before Friday." });
});

test("later mentions are listed by date, newest first, as plain facts", () => {
  assert.deepEqual(
    summarizeThread(mentions).later.map((m) => m.day),
    ["2026-09-18", "2026-09-15"],
  );
});

test("a single mention has no later mentions", () => {
  assert.deepEqual(summarizeThread([mentions[1]]).later, []);
});
