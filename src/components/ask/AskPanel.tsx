import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { askMemory } from "@/lib/memory-search.functions";
import { loadMoments } from "@/lib/moments";
import { loadOwnAi, useAiAccess } from "@/lib/ai-client";
import { aiErrorMessage } from "@/lib/ai-model";
import { linkCitedDates, selectForAsk, type AreaFilter, type Segment } from "@/lib/ask-model";

/**
 * Ask anything about your own life. Entries are chosen and decrypted on
 * this device; only those (with their dates) go to the AI for this one
 * question. Dates in the answer link to that day in the Vault.
 */
export function AskPanel({ onNavigate }: { onNavigate?: () => void }) {
  const ask = useServerFn(askMemory);
  const { hasAi, loading: aiLoading } = useAiAccess();
  const [question, setQuestion] = useState("");
  const [area, setArea] = useState<AreaFilter>("both");
  const [answer, setAnswer] = useState<Segment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!question.trim()) return;
    setBusy(true);
    setAnswer(null);
    setError(null);
    try {
      const moments = await loadMoments({ limit: 2000 });
      const today = new Date().toISOString().slice(0, 10);
      const picked = selectForAsk(
        moments.map((m) => ({
          id: m.id,
          day: m.day,
          area: m.area,
          text: [m.text ?? "", m.fileText].filter((t) => t.trim()).join("\n\n"),
        })),
        question,
        today,
        area,
      );
      const res = await ask({
        data: {
          ai: await loadOwnAi(),
          question: question.trim(),
          entries: picked.map((p) => ({ date: p.day, title: null, content: p.text })),
        },
      });
      setAnswer(
        linkCitedDates(
          res.answer,
          picked.map((p) => p.day),
        ),
      );
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!aiLoading && !hasAi) {
    return (
      <p className="text-sm text-foreground/85 leading-relaxed">
        Ask needs AI.{" "}
        <Link
          to="/settings"
          onClick={onNavigate}
          className="text-gold underline-offset-4 hover:underline"
        >
          Add your own AI key
        </Link>{" "}
        (free), or upgrade to Soul.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void run()}
          placeholder="When did I last feel proud?"
          className="flex-1 h-11 px-4 rounded-[14px] bg-[#0A0A0F] outline-none text-sm"
          style={{ border: "1px solid rgba(240,201,106,0.25)" }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !question.trim()}
          className="px-5 rounded-[14px] text-xs uppercase tracking-[0.2em] text-background disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
        >
          {busy ? "…" : "Ask"}
        </button>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Which part of your life">
        {(["both", "work", "life"] as AreaFilter[]).map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={area === a}
            onClick={() => setArea(a)}
            className="px-3 h-8 rounded-full text-xs capitalize"
            style={{
              border: `1px solid rgba(240,201,106,${area === a ? 0.6 : 0.18})`,
              color: area === a ? "#F0C96A" : "rgba(220,220,220,0.7)",
            }}
          >
            {a === "both" ? "Work & life" : a}
          </button>
        ))}
      </div>
      {busy && <p className="text-xs text-muted-foreground italic">Walking through your pages…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {answer && (
        <p
          className="text-[15px] text-foreground/90 leading-relaxed"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {answer.map((s, i) =>
            "day" in s ? (
              <Link
                key={i}
                to="/vault"
                search={{ day: s.day }}
                onClick={onNavigate}
                className="text-gold underline underline-offset-4 decoration-gold/40 hover:text-gold-light"
              >
                {s.text}
              </Link>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
}
