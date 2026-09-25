import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickMimeType,
  chooseBackend,
  combineTextAndTranscript,
  formatElapsed,
  cleanTranscript,
} from "../src/lib/voice-model.ts";

test("records in a format the browser supports (iPhone Safari only does mp4)", () => {
  assert.equal(
    pickMimeType((t) => t === "audio/mp4"),
    "audio/mp4",
  );
  assert.equal(
    pickMimeType((t) => t.startsWith("audio/webm")),
    "audio/webm;codecs=opus",
  );
  assert.equal(
    pickMimeType(() => false),
    "",
  );
});

test("iPhones and iPads transcribe on the CPU, since GPU mode fails there", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
  assert.equal(chooseBackend(iphone, true), "wasm");
  assert.equal(chooseBackend("Mozilla/5.0 (Windows NT 10.0) Chrome/130", true), "webgpu");
  assert.equal(chooseBackend("Mozilla/5.0 (Windows NT 10.0) Chrome/130", false), "wasm");
});

test("a transcript is added after typed words, never replacing them", () => {
  assert.equal(
    combineTextAndTranscript("Typed note", "spoken words"),
    "Typed note\n\nspoken words",
  );
  assert.equal(combineTextAndTranscript("", "spoken words"), "spoken words");
  assert.equal(combineTextAndTranscript("Typed note", ""), "Typed note");
});

test("elapsed time reads as m:ss with no upper limit", () => {
  assert.equal(formatElapsed(5), "0:05");
  assert.equal(formatElapsed(185), "3:05");
  assert.equal(formatElapsed(3725), "62:05");
});

test("silence markers from the model are not treated as words", () => {
  assert.equal(cleanTranscript(" [BLANK_AUDIO] "), "");
  assert.equal(cleanTranscript(" Hello there. [Music] "), "Hello there.");
});
