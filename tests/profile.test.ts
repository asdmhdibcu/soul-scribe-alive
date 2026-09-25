import { test } from "node:test";
import assert from "node:assert/strict";
import { profileReady, profileMomentText, yesterdayEvening } from "../src/lib/profile-model.ts";

const p = {
  name: "Asad",
  goingOn: "Launching Alive and moving flat.",
  briefHour: 7,
  work: "",
  people: "",
  goals: "",
};

test("only name, what's going on and brief time are required", () => {
  assert.equal(profileReady(p), true);
  assert.equal(profileReady({ ...p, goingOn: "  " }), false);
  assert.equal(profileReady({ ...p, name: "" }), false);
});

test("the profile becomes a moment in the person's own words, optional parts only if given", () => {
  assert.equal(profileMomentText(p), "What's going on right now: Launching Alive and moving flat.");
  assert.equal(
    profileMomentText({ ...p, work: "Founder", goals: "Ship by December" }),
    "What's going on right now: Launching Alive and moving flat.\n\nMy work: Founder\n\nWhat I'm aiming for: Ship by December",
  );
});

test("the yesterday entry is dated yesterday evening, local time", () => {
  const now = new Date(2026, 8, 25, 9, 30); // 25 Sep, 09:30 local
  const y = new Date(yesterdayEvening(now));
  assert.equal(y.getDate(), 24);
  assert.equal(y.getHours(), 20);
});
