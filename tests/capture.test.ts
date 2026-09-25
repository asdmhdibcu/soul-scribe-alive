import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareTextMoment } from "../src/lib/moments-model.ts";

const now = new Date("2026-09-25T09:15:00Z");

test("typed text becomes a text moment captured now", () => {
  assert.deepEqual(prepareTextMoment("Called the bank", now), {
    kind: "text",
    captured_at: "2026-09-25T09:15:00.000Z",
    text: "Called the bank",
  });
});

test("the person's words are kept exactly, including inner spacing and line breaks", () => {
  const typed = "  First line\n\n  indented second line  ";
  assert.equal(prepareTextMoment(typed, now)?.text, typed);
});

test("nothing to save when only whitespace was typed", () => {
  assert.equal(prepareTextMoment("   \n\t ", now), null);
  assert.equal(prepareTextMoment("", now), null);
});
