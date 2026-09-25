import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBrief, echoDay, recentWindow, type BriefSource } from "../src/lib/brief-model.ts";

const sources: BriefSource[] = [
  { date: "2026-09-12", text: "I need to call the bank before Friday." },
  { date: "2026-09-20", text: "Hamza project launch moved to October." },
];

const item = (over: Record<string, string> = {}) => ({
  kind: "thread",
  text: "The Hamza launch moved.",
  citedDate: "2026-09-20",
  quote: "launch moved to October",
  ...over,
});

test("items quoting the person's words on the cited day are kept", () => {
  assert.equal(validateBrief([item()], sources).length, 1);
});

test("a quote that isn't word for word, or is from a different day, is dropped", () => {
  assert.equal(validateBrief([item({ quote: "launch was delayed" })], sources).length, 0);
  assert.equal(validateBrief([item({ citedDate: "2026-09-12" })], sources).length, 0);
});

test("anything asking about follow-through is dropped", () => {
  assert.equal(
    validateBrief(
      [item({ text: "Did you call the bank?", quote: "call the bank", citedDate: "2026-09-12" })],
      sources,
    ).length,
    0,
  );
});

test("never more than five items", () => {
  const many = Array.from({ length: 8 }, () => item());
  assert.equal(validateBrief(many, sources).length, 5);
});

test("echoes come from exactly one year ago", () => {
  assert.equal(echoDay("2026-09-25"), "2025-09-25");
  assert.equal(echoDay("2028-02-29"), "2027-02-28");
});

test("recent days cover the last 14 days including today", () => {
  assert.deepEqual(recentWindow("2026-09-25"), { from: "2026-09-12", to: "2026-09-25" });
});
