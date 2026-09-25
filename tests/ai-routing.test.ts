import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAi, AI_PROVIDERS, AI_NEEDS_KEY, redactKey } from "../src/lib/ai-model.ts";

const own = { provider: "openai" as const, model: "gpt-4.1-mini", apiKey: "sk-test-1234567890" };

test("a person's own key is always used when they have one, on any plan", () => {
  assert.deepEqual(resolveAi(own, "free"), {
    source: "own",
    ...own,
    baseURL: AI_PROVIDERS.openai.baseURL,
  });
  assert.equal(resolveAi(own, "soul").source, "own");
});

test("paid plans without a key use Alive's cloud AI", () => {
  assert.deepEqual(resolveAi(undefined, "soul"), { source: "cloud" });
  assert.deepEqual(resolveAi(undefined, "family"), { source: "cloud" });
});

test("free plan without a key gets a clear 'add a key' outcome, never the cloud", () => {
  assert.deepEqual(resolveAi(undefined, "free"), { source: "none", reason: AI_NEEDS_KEY });
  assert.deepEqual(resolveAi(undefined, null), { source: "none", reason: AI_NEEDS_KEY });
});

test("an empty key or model counts as no key", () => {
  assert.equal(resolveAi({ ...own, apiKey: "  " }, "free").source, "none");
  assert.equal(resolveAi({ ...own, model: "" }, "free").source, "none");
});

test("every provider speaks the OpenAI-compatible API", () => {
  assert.equal(AI_PROVIDERS.openai.baseURL, "https://api.openai.com/v1");
  assert.equal(AI_PROVIDERS.anthropic.baseURL, "https://api.anthropic.com/v1/");
  assert.equal(
    AI_PROVIDERS.google.baseURL,
    "https://generativelanguage.googleapis.com/v1beta/openai/",
  );
});

test("keys are shown only as their last four characters", () => {
  assert.equal(redactKey("sk-test-1234567890"), "••••7890");
});
