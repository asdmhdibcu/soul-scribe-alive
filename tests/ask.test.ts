import { test } from "node:test";
import assert from "node:assert/strict";
import { selectForAsk, linkCitedDates, type AskMoment } from "../src/lib/ask-model.ts";

const m = (
  id: string,
  day: string,
  text: string,
  area: "work" | "life" | null = null,
): AskMoment => ({
  id,
  day,
  text,
  area,
});
const today = "2026-09-25";

test("old entries are included when they share words with the question", () => {
  const list = [
    m("old", "2025-11-02", "Signed the lease for the Leeds flat"),
    m("old2", "2025-10-01", "Dinner with Sara"),
    m("recent", "2026-09-20", "Busy week"),
  ];
  const picked = selectForAsk(list, "When did I sign the lease?", today).map((x) => x.id);
  assert.ok(picked.includes("old"));
  assert.ok(!picked.includes("old2"));
  assert.ok(picked.includes("recent")); // last 90 days always included
});

test("today's entries are always included, and the total is capped at 120", () => {
  const many = Array.from({ length: 300 }, (_, i) => m(`r${i}`, "2026-09-01", "note"));
  const picked = selectForAsk([m("t", today, "just now"), ...many], "anything", today);
  assert.equal(picked.length, 120);
  assert.equal(picked[0].id, "t");
});

test("the work / life switch filters by area, keeping entries not yet tagged", () => {
  const list = [
    m("w", "2026-09-20", "standup", "work"),
    m("l", "2026-09-20", "gym", "life"),
    m("u", "2026-09-21", "untagged"),
  ];
  assert.deepEqual(
    selectForAsk(list, "q", today, "work")
      .map((x) => x.id)
      .sort(),
    ["u", "w"],
  );
});

test("dates in the answer become links to that day, only when an entry exists then", () => {
  const segs = linkCitedDates("On September 12th you wrote about the bank. On May 3 nothing.", [
    "2026-09-12",
    "2026-09-20",
  ]);
  assert.deepEqual(segs, [
    { text: "On " },
    { text: "September 12th", day: "2026-09-12" },
    { text: " you wrote about the bank. On May 3 nothing." },
  ]);
});

test("day-first and ISO dates link too", () => {
  const segs = linkCitedDates("12 Sep and 2026-09-20.", ["2026-09-12", "2026-09-20"]);
  assert.deepEqual(
    segs.filter((s) => "day" in s).map((s) => (s as { day: string }).day),
    ["2026-09-12", "2026-09-20"],
  );
});
