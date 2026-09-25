import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDate, splitDatedEntries, parseDayOne, stableUuid } from "../src/lib/import-model.ts";

const lastMod = new Date("2026-01-10T12:00:00Z").getTime();

test("a date in the file name wins", () => {
  assert.equal(detectDate("2025-11-02 lease.md", "hello", lastMod), "2025-11-02");
  assert.equal(detectDate("journal_20251103.txt", "hello", lastMod), "2025-11-03");
});

test("otherwise a date on the first line, then the file's modified date", () => {
  assert.equal(detectDate("notes.txt", "2 November 2025\nSigned the lease", lastMod), "2025-11-02");
  assert.equal(detectDate("notes.txt", "November 2, 2025 — lease", lastMod), "2025-11-02");
  assert.equal(detectDate("notes.txt", "no date here", lastMod), "2026-01-10");
});

test("pasted text splits into entries at lines that are just a date", () => {
  const text = "2025-11-02\nSigned the lease.\nFelt good.\n\n3 November 2025\nMoved boxes.";
  assert.deepEqual(splitDatedEntries(text), [
    { date: "2025-11-02", text: "Signed the lease.\nFelt good." },
    { date: "2025-11-03", text: "Moved boxes." },
  ]);
});

test("pasted text with no date lines stays one entry", () => {
  assert.deepEqual(splitDatedEntries("Just some notes\nabout the week"), [
    { date: null, text: "Just some notes\nabout the week" },
  ]);
});

test("Day One entries keep their date, text and photo references", () => {
  const journal = {
    entries: [
      {
        uuid: "ABC123",
        creationDate: "2024-05-01T08:30:00Z",
        text: "First day in Leeds\n![](dayone-moment://F00D)\nNew flat.",
        photos: [{ identifier: "F00D", md5: "d41d8cd9", type: "jpeg" }],
      },
      { uuid: "EMPTY", creationDate: "2024-05-02T08:30:00Z", text: "   " },
    ],
  };
  assert.deepEqual(parseDayOne(journal), [
    {
      uuid: "ABC123",
      capturedAt: "2024-05-01T08:30:00Z",
      text: "First day in Leeds\n\nNew flat.",
      photos: [{ file: "photos/d41d8cd9.jpeg", type: "image/jpeg" }],
    },
  ]);
});

test("the same source always gets the same id, so re-importing makes no copies", async () => {
  const a = await stableUuid("dayone:ABC123");
  assert.equal(a, await stableUuid("dayone:ABC123"));
  assert.notEqual(a, await stableUuid("dayone:XYZ"));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
