import { test } from "node:test";
import assert from "node:assert/strict";
import { reminderDue } from "../src/lib/reminder-model.ts";

const prefs = {
  brief_email: true,
  brief_hour: 7,
  timezone: "Europe/London",
  last_brief_email_on: null as string | null,
};

test("due in the person's own time zone at their chosen hour", () => {
  // 06:30 UTC on 25 Sep = 07:30 in London (BST).
  const r = reminderDue(prefs, new Date("2026-09-25T06:30:00Z"));
  assert.deepEqual(r, { due: true, localDate: "2026-09-25" });
  assert.equal(reminderDue(prefs, new Date("2026-09-25T05:30:00Z")).due, false);
});

test("a different time zone gets it at their own 7am", () => {
  const karachi = { ...prefs, timezone: "Asia/Karachi" }; // UTC+5
  assert.equal(reminderDue(karachi, new Date("2026-09-25T02:10:00Z")).due, true);
});

test("never twice on the same local day, and never when switched off", () => {
  assert.equal(
    reminderDue({ ...prefs, last_brief_email_on: "2026-09-25" }, new Date("2026-09-25T06:30:00Z"))
      .due,
    false,
  );
  assert.equal(
    reminderDue({ ...prefs, brief_email: false }, new Date("2026-09-25T06:30:00Z")).due,
    false,
  );
});

test("an unknown time zone falls back to UTC instead of failing", () => {
  assert.equal(
    reminderDue({ ...prefs, timezone: "Mars/Olympus" }, new Date("2026-09-25T07:05:00Z")).due,
    true,
  );
});
