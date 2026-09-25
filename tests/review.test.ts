import { test } from "node:test";
import assert from "node:assert/strict";
import { compileDay } from "../src/lib/writing-stats.ts";

test("the day's record is the person's own words in time order, with times", () => {
  const out = compileDay(
    [
      { capturedAt: "2026-09-25T18:40:00Z", text: "Long walk after work." },
      { capturedAt: "2026-09-25T08:05:00Z", text: "Nervous about the pitch." },
      { capturedAt: "2026-09-25T12:00:00Z", text: null },
    ],
    (iso) => iso.slice(11, 16),
  );
  assert.equal(out, "08:05 — Nervous about the pitch.\n\n18:40 — Long walk after work.");
});

test("an empty day compiles to an empty record", () => {
  assert.equal(
    compileDay([], (i) => i),
    "",
  );
});
