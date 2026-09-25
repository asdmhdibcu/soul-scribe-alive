import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readableKind,
  docxXmlToText,
  clampText,
  MAX_FILE_TEXT,
} from "../src/lib/file-text-model.ts";

test("recognises files whose text can be read on the device", () => {
  assert.equal(readableKind("application/pdf", "q3.pdf"), "pdf");
  assert.equal(
    readableKind(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "a.docx",
    ),
    "docx",
  );
  assert.equal(readableKind("", "notes.md"), "text");
  assert.equal(readableKind("text/plain", "a.txt"), "text");
  assert.equal(readableKind("text/csv", "a.csv"), "text");
  assert.equal(readableKind("image/png", "scan.png"), null);
  assert.equal(readableKind("application/zip", "a.zip"), null);
});

test("Word text keeps paragraphs and decodes entities", () => {
  const xml =
    "<w:document><w:body><w:p><w:r><w:t>Q3 proposal for Hamza</w:t></w:r></w:p>" +
    '<w:p><w:r><w:t xml:space="preserve">Budget: </w:t></w:r><w:r><w:t>£12,000 &amp; review</w:t></w:r></w:p>' +
    "<w:p><w:r><w:t>Tabs</w:t><w:tab/><w:t>here</w:t><w:br/><w:t>next</w:t></w:r></w:p></w:body></w:document>";
  assert.equal(
    docxXmlToText(xml),
    "Q3 proposal for Hamza\nBudget: £12,000 & review\nTabs\there\nnext",
  );
});

test("very long documents are cut to a safe size", () => {
  assert.equal(clampText("x".repeat(MAX_FILE_TEXT + 50)).length, MAX_FILE_TEXT);
  assert.equal(clampText("  short  "), "short");
});

import { toMoment, momentsForAi, quotesInMoments } from "../src/lib/moments-model.ts";
import { generateMasterKey, encrypt, decrypt } from "../src/lib/crypto.ts";

test("text read from a file counts as the moment's words for the AI and for quotes", async () => {
  const key = await generateMasterKey();
  const open = async (p: string) => decrypt(p, key).catch(() => null);
  const m = await toMoment(
    {
      id: "m1",
      captured_at: "2026-09-14T09:00:00Z",
      kind: "file",
      body_enc: null,
      audio_path: null,
      photo_path: null,
      area_enc: await encrypt("work", key),
      moment_files: [
        {
          id: "f1",
          path: "p",
          kind: "file",
          name_enc: await encrypt("Q3.pdf", key),
          mime_enc: await encrypt("application/pdf", key),
          text_enc: await encrypt("Launch moved to October.", key),
          size_bytes: 10,
        },
      ],
    },
    open,
  );
  assert.equal(m.area, "work");
  assert.deepEqual(momentsForAi([m]), [
    { date: "2026-09-14", title: null, content: "Launch moved to October." },
  ]);
  assert.deepEqual(quotesInMoments(["moved to October"], [m]), ["moved to October"]);
});
