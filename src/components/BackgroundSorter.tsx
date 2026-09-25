import { useEffect } from "react";
import { MOMENT_SAVED_EVENT } from "@/lib/moments";
import { AI_SETTINGS_CHANGED } from "@/lib/ai-client";
import { sortPending } from "@/lib/sorter";

/** Runs the silent filing pass on open and a few seconds after each save. */
export function BackgroundSorter() {
  useEffect(() => {
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sortPending(), 4000);
    };
    soon();
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
