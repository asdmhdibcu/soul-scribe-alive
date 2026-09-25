import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ThumbsUp } from "lucide-react";
import { buildBrief, loadBrief, localToday, markUseful, type Brief } from "@/lib/brief";
import { useAiAccess } from "@/lib/ai-client";

function fmt(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
}

/**
 * Today's brief at the top of the home screen. Built on first open of the
 * day (on this device), then read back. Every item quotes the person and
 * links to the day they said it.
 */
export function BriefCard() {
  const { hasAi, loading: aiLoading } = useAiAccess();
  const [brief, setBrief] = useState<Brief | null | undefined>(undefined);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (aiLoading) return;
    const today = localToday();
    let cancelled = false;
    (async () => {
      const existing = await loadBrief(today).catch(() => null);
      if (existing || !hasAi) {
        if (!cancelled) setBrief(existing);
        return;
      }
      setBuilding(true);
      const built = await buildBrief(today).catch((e) => {
        console.info("[brief]", e);
        return null;
      });
      if (!cancelled) {
        setBrief(built);
        setBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aiLoading, hasAi]);

  if (brief === undefined && !building) return null;

  return (
    <section
      className="rounded-[14px] p-5"
      style={{
        background: "linear-gradient(160deg, rgba(240,201,106,0.08), #16161F)",
        border: "1px solid rgba(240,201,106,0.3)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80">This morning</p>
      {building && (
        <p className="mt-3 text-sm text-muted-foreground italic">Reading your last two weeks…</p>
      )}
      {!building && !brief?.items.length && (
        <p className="mt-3 text-sm text-muted-foreground" style={{ fontFamily: "Georgia, serif" }}>
          {hasAi ? (
            "Nothing to hand you yet. It fills in as you write."
          ) : (
            <>
              Your brief needs AI.{" "}
              <Link to="/settings" className="text-gold underline-offset-4 hover:underline">
                Add your own AI key
              </Link>{" "}
              (free), or upgrade to Soul.
            </>
          )}
        </p>
      )}
      {brief && brief.items.length > 0 && (
        <ul className="mt-4 space-y-4">
          {brief.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex-1">
                <p
                  className="text-[15px] text-foreground/90 leading-relaxed"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {item.text}
                </p>
                <p
                  className="mt-1 text-sm text-foreground/70 italic"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  “{item.quote}”{" "}
                  <Link
                    to="/vault"
                    search={{ day: item.citedDate }}
                    className="not-italic text-xs text-gold/80 hover:text-gold-light"
                  >
                    — {fmt(item.citedDate)}
                  </Link>
                </p>
              </div>
              <button
                type="button"
                onClick={() => void markUseful(brief, i).then(setBrief)}
                aria-label="This was useful"
                title="This was useful"
                aria-pressed={brief.useful.includes(i)}
                className={
                  brief.useful.includes(i)
                    ? "text-gold-light"
                    : "text-muted-foreground/60 hover:text-gold-light"
                }
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
