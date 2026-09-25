import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitAttachments,
  storageCheck,
  momentKindFor,
  storagePath,
  FREE_STORAGE_BYTES,
} from "../src/lib/capture-model.ts";
import { toMoment } from "../src/lib/moments-model.ts";
import { generateMasterKey, encrypt, decrypt } from "../src/lib/crypto.ts";

const f = (name: string, type: string, size = 1000) => ({ name, type, size });

test("images are photos (up to 3); everything else is a file", () => {
  const r = splitAttachments([
    f("a.jpg", "image/jpeg"),
    f("q3.pdf", "application/pdf"),
    f("b.png", "image/png"),
    f("c.heic", "image/heic"),
    f("d.webp", "image/webp"),
  ]);
  assert.deepEqual(
    r.photos.map((x) => x.name),
    ["a.jpg", "b.png", "c.heic"],
  );
  assert.deepEqual(
    r.files.map((x) => x.name),
    ["q3.pdf"],
  );
  assert.equal(r.extraPhotos, 1);
});

test("free storage is 500 MB; an upload that would pass it is refused", () => {
  assert.equal(FREE_STORAGE_BYTES, 500 * 1024 * 1024);
  const used = 499 * 1024 * 1024;
  assert.equal(storageCheck(used, 512 * 1024, FREE_STORAGE_BYTES).ok, true);
  const over = storageCheck(used, 2 * 1024 * 1024, FREE_STORAGE_BYTES);
  assert.equal(over.ok, false);
  assert.equal(over.remainingBytes, 1024 * 1024);
});

test("a moment's kind follows what was captured", () => {
  assert.equal(momentKindFor({ text: "hi", photos: 0, files: 0, audio: false }), "text");
  assert.equal(momentKindFor({ text: "", photos: 2, files: 0, audio: false }), "photo");
  assert.equal(momentKindFor({ text: "", photos: 0, files: 1, audio: false }), "file");
  assert.equal(momentKindFor({ text: "", photos: 1, files: 0, audio: true }), "voice");
});

test("stored media sits in the owner's folder, with no original file name", () => {
  assert.equal(storagePath("u1", "m1", "f1"), "u1/m1/f1.bin");
});

test("attachment names are decrypted on the device", async () => {
  const key = await generateMasterKey();
  const open = async (p: string) => decrypt(p, key).catch(() => null);
  const m = await toMoment(
    {
      id: "m1",
      captured_at: "2026-09-25T09:00:00Z",
      kind: "file",
      body_enc: null,
      audio_path: null,
      photo_path: null,
      moment_files: [
        {
          id: "f1",
          path: "u1/m1/f1.bin",
          kind: "file",
          name_enc: await encrypt("Q3 proposal.pdf", key),
          mime_enc: await encrypt("application/pdf", key),
          size_bytes: 2048,
        },
      ],
    },
    open,
  );
  assert.equal(m.kind, "file");
  assert.deepEqual(m.attachments, [
    {
      id: "f1",
      path: "u1/m1/f1.bin",
      kind: "file",
      name: "Q3 proposal.pdf",
      mime: "application/pdf",
      size: 2048,
    },
  ]);
});
