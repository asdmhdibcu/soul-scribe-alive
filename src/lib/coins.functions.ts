import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { amount: number; reason: string };

export const awardCoins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    const amount = Math.floor(Number(data?.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500) {
      throw new Error("Invalid coin amount");
    }
    const reason = String(data?.reason ?? "").slice(0, 200);
    return { amount, reason };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("coins_history").insert({
      user_id: context.userId,
      amount: data.amount,
      reason: data.reason,
    });
    if (error) throw error;
    return { ok: true };
  });
