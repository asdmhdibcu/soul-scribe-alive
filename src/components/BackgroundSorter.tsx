import { useEffect } from "react";
import { MOMENT_SAVED_EVENT } from "@/lib/moments";
import { AI_SETTINGS_CHANGED } from "@/lib/ai-client";
import { sortPending } from "@/lib/sorter";
import { supabase } from "@/integrations/supabase/client";

/** Keeps the brief's time zone in step with this device (e.g. after travelling). */
async function syncTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await supabase.from("user_prefs").select("user_id, timezone").maybeSingle();
  if (data && data.timezone !== timezone) {
    await supabase.from("user_prefs").update({ timezone }).eq("user_id", data.user_id);
  }
}

/** Runs the silent filing pass on open and a few seconds after each save. */
export function BackgroundSorter() {
  useEffect(() => {
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sortPending(), 4000);
    };
    soon();
    void syncTimezone().catch(() => {});
    window.addEventListener(MOMENT_SAVED_EVENT, soon);
    window.addEventListener(AI_SETTINGS_CHANGED, soon);
    window.addEventListener("online", soon);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(MOMENT_SAVED_EVENT, soon);
      window.removeEventListener(AI_SETTINGS_CHANGED, soon);
      window.removeEventListener("online", soon);
    };
  }, []);
  return null;
}
