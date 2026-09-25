import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sunrise } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Morning brief time and the optional reminder email. Time zone comes from this device. */
export function BriefSettings() {
  const [hour, setHour] = useState(7);
  const [email, setEmail] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    void supabase
      .from("user_prefs")
      .select("brief_hour, brief_email")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHour(data.brief_hour);
          setEmail(data.brief_email);
        }
        setLoaded(true);
      });
  }, []);

  async function save(next: { hour?: number; email?: boolean }) {
    const h = next.hour ?? hour;
    const e = next.email ?? email;
    setHour(h);
    setEmail(e);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("user_prefs")
      .upsert(
        { user_id: u.user.id, brief_hour: h, brief_email: e, timezone },
        { onConflict: "user_id" },
      );
    if (error) toast.error("Could not save.");
    else toast.success("Saved.");
  }

  const label = (h: number) =>
    new Date(2026, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <section
      className="mt-6 rounded-[14px] p-5"
      style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.2)" }}
    >
      <div className="flex items-center gap-2 text-gold-light">
        <Sunrise className="h-4 w-4" />
        <h2 className="font-display text-xl">Morning brief</h2>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="text-sm text-foreground/85">
          Ready at{" "}
          <select
            value={hour}
            disabled={!loaded}
            onChange={(e) => void save({ hour: Number(e.target.value) })}
            className="ml-2 h-10 rounded-[14px] bg-[#0A0A0F] px-3 text-sm"
            style={{ border: "1px solid rgba(240,201,106,0.2)" }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {label(h)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground/85">
          <input
            type="checkbox"
            checked={email}
            disabled={!loaded}
            onChange={(e) => void save({ email: e.target.checked })}
            className="h-4 w-4 accent-[#C9A84C]"
          />
          Email me when it's ready
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        Time zone: {timezone}. The email is only a reminder with a link: your brief is put together
        on your own device, so it's never in the email.
      </p>
    </section>
  );
}
