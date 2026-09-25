import { z } from "zod";

/**
 * The person's own AI key, decrypted on their device and sent with a single
 * request over HTTPS. The server uses it for that request only: it is never
 * stored or logged.
 */
export const OwnAiSchema = z
  .object({
    provider: z.enum(["openai", "anthropic", "google"]),
    model: z.string().trim().min(1).max(100),
    apiKey: z.string().trim().min(8).max(400),
  })
  .optional();
