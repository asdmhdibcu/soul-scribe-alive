import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { reminderDue } from "@/lib/reminder-model";

/**
 * Hourly job: emails a reminder that today's brief is ready. The email
 * holds no diary content — the brief is encrypted, so the server cannot
 * read it; it is built on the person's device when they open Alive.
 *
 * Call with POST and "Authorization: Bearer <CRON_SECRET>". Needs
 * RESEND_API_KEY and BRIEF_FROM_EMAIL (e.g. "Alive <brief@yourdomain>").
 */
export const Route = createFileRoute("/api/brief-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        const resendKey = process.env.RESEND_API_KEY;
        const from = process.env.BRIEF_FROM_EMAIL;
        if (!resendKey || !from) {
          return Response.json(
            { error: "Email is not set up: add RESEND_API_KEY and BRIEF_FROM_EMAIL." },
            { status: 503 },
          );
        }
        const appUrl = process.env.APP_URL ?? "https://soul-scribe-alive.lovable.app";

        const { data: prefs, error } = await supabaseAdmin
          .from("user_prefs")
          .select("user_id, brief_email, brief_hour, timezone, last_brief_email_on")
          .eq("brief_email", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const now = new Date();
        let sent = 0;
        let failed = 0;
        for (const p of prefs ?? []) {
          const { due, localDate } = reminderDue(p, now);
          if (!due) continue;
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
          const to = u.user?.email;
          if (!to) continue;
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from,
              to,
              subject: "Your morning brief is ready",
              text: `Good morning. What's alive in your life is waiting for you:\n\n${appUrl}/today\n\nFor privacy, your brief is only put together on your own device, so it isn't in this email.\n\nTo stop these emails, turn off "Email me when it's ready" in Settings.`,
            }),
          });
          if (res.ok) {
            sent++;
            await supabaseAdmin
              .from("user_prefs")
              .update({ last_brief_email_on: localDate })
              .eq("user_id", p.user_id);
          } else {
            failed++;
          }
        }
        return Response.json({ sent, failed });
      },
    },
  },
});
