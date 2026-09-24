import { test } from "node:test";
import assert from "node:assert/strict";
import { daysWrittenInLast, sessionRawText, buildDayEntries } from "../src/lib/writing-stats.ts";

test("counts distinct days written in the last 30 days, including today", () => {
  const days = ["2026-09-25", "2026-09-25", "2026-09-10", "2026-08-27", "2026-08-26"];
  // 30-day window ending 2026-09-25 starts 2026-08-27.
  assert.equal(daysWrittenInLast(days, "2026-09-25", 30), 3);
});

test("no writing means zero, never negative or guilt-framed", () => {
  assert.equal(daysWrittenInLast([], "2026-09-25", 30), 0);
});

test("the session saves only the person's own words, not the AI page", () => {
  assert.equal(
    sessionRawText({
      oneAnswer: "  I felt proud of the pitch ",
      voiceTranscript: "",
      story: "Long walk",
    }),
    "I felt proud of the pitch\n\nLong walk",
  );
  assert.equal(sessionRawText({ oneAnswer: "", voiceTranscript: " ", story: "" }), "");
});

test("insights get one entry per day, newest first, with that day's mood", () => {
  const entries = buildDayEntries(
    [
      { day: "2026-09-20", text: "Morning run" },
      { day: "2026-09-20", text: "Called mum" },
      { day: "2026-09-22", text: null },
      { day: "2026-09-21", text: "Deadline stress" },
    ],
    { "2026-09-21": { x: 0.2, y: -0.4, color: "#88f" } },
  );
  assert.deepEqual(
    entries.map((e) => [e.date, e.content, e.mood_y]),
    [
      ["2026-09-21", "Deadline stress", -0.4],
      ["2026-09-20", "Morning run\n\nCalled mum", null],
    ],
  );
});
