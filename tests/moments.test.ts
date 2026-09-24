import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMasterKey, encrypt, decrypt } from "../src/lib/crypto.ts";
import {
  toMoment,
  filterMoments,
  momentsForAi,
  quotesInMoments,
} from "../src/lib/moments-model.ts";

async function opener() {
  const key = await generateMasterKey();
  const open = async (p: string) => {
    try {
      return await decrypt(p, key);
    } catch {
      return null;
    }
  };
  return { key, open };
}

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "m1",
  captured_at: "2026-09-12T08:30:00Z",
  kind: "text",
  body_enc: null,
  audio_path: null,
  photo_path: null,
  ...over,
});

test("a moment's text is decrypted on the device", async () => {
  const { key, open } = await opener();
  const m = await toMoment(row({ body_enc: await encrypt("Called the bank today", key) }), open);
  assert.equal(m.text, "Called the bank today");
  assert.equal(m.decryptFailed, false);
  assert.equal(m.capturedAt, "2026-09-12T08:30:00Z");
});

test("a moment that cannot be decrypted is flagged, never shown as blank", async () => {
  const { open } = await opener();
  const other = await generateMasterKey();
  const m = await toMoment(row({ body_enc: await encrypt("secret", other) }), open);
  assert.equal(m.decryptFailed, true);
  assert.equal(m.text, null);
});

test("a photo or voice moment without text is not a failure", async () => {
  const { open } = await opener();
  const m = await toMoment(row({ kind: "photo", photo_path: "u/p.bin" }), open);
  assert.equal(m.decryptFailed, false);
  assert.equal(m.hasPhoto, true);
});

test("search matches words in decrypted text, ignoring case", async () => {
  const { key, open } = await opener();
  const list = [
    await toMoment(
      row({ id: "a", body_enc: await encrypt("Worried about the Hamza project", key) }),
      open,
    ),
    await toMoment(row({ id: "b", body_enc: await encrypt("Walked by the canal", key) }), open),
  ];
  assert.deepEqual(
    filterMoments(list, { search: "hamza" }).map((m) => m.id),
    ["a"],
  );
  assert.equal(filterMoments(list, { search: "" }).length, 2);
});

test("filters by kind and by date", async () => {
  const { open } = await opener();
  const list = [
    await toMoment(row({ id: "old", captured_at: "2026-06-01T10:00:00Z" }), open),
    await toMoment(row({ id: "voice", kind: "voice", captured_at: "2026-09-20T10:00:00Z" }), open),
  ];
  assert.deepEqual(
    filterMoments(list, { kind: "voice" }).map((m) => m.id),
    ["voice"],
  );
  assert.deepEqual(
    filterMoments(list, { since: "2026-09-01" }).map((m) => m.id),
    ["voice"],
  );
});

test("only readable text is sent to the AI, with its date", async () => {
  const { key, open } = await opener();
  const list = [
    await toMoment(row({ id: "a", body_enc: await encrypt("First day at work", key) }), open),
    await toMoment(row({ id: "b", kind: "photo", photo_path: "x" }), open),
  ];
  assert.deepEqual(momentsForAi(list), [
    { date: "2026-09-12", title: null, content: "First day at work" },
  ]);
});

test("AI-quoted memories are kept only if they appear word for word", async () => {
  const { key, open } = await opener();
  const list = [
    await toMoment(row({ body_enc: await encrypt("I finally said yes to the job", key) }), open),
  ];
  assert.deepEqual(quotesInMoments(["finally said yes to the job", "you felt brave"], list), [
    "finally said yes to the job",
  ]);
});
