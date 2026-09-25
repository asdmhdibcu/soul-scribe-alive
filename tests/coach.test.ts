import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCoach } from "../src/lib/brief-model.ts";

const sources = [{ date: "2026-09-03", text: "I want to run twice a week." }];
const s = (over: Record<string, string> = {}) => ({
  text: "You said you want to run twice a week; Saturday mornings have been free lately.",
  citedDate: "2026-09-03",
  quote: "I want to run twice a week.",
  ...over,
});

test("a suggestion stays only if it quotes what the person said, on that day", () => {
  assert.equal(validateCoach([s()], sources, 3).length, 1);
  assert.equal(validateCoach([s({ quote: "I will run every day" })], sources, 3).length, 0);
});

test("no guilt questions: anything with a question mark is dropped", () => {
  assert.equal(validateCoach([s({ text: "Have you been running?" })], sources, 3).length, 0);
});

test("health talk is dropped even if quoted", () => {
  assert.equal(
    validateCoach([s({ text: "Running may help your anxiety diagnosis." })], sources, 3).length,
    0,
  );
});

test("the brief gets at most one Coach line", () => {
  assert.equal(validateCoach([s(), s(), s()], sources, 1).length, 1);
});
