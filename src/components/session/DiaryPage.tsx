import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { awardCoins } from "@/lib/coins.functions";
import { GoldButton } from "@/components/auth/AuthShell";
import type { DiaryResult } from "@/lib/diary.functions";
import type { SwipeResult } from "@/components/session/SparkCards";

type Props = {
  diary: DiaryResult;
  moodColor: string;
  moodX: number;
  moodY: number;
  cards: SwipeResult[];
  photos: string[];
  voiceTranscript: string;
  oneAnswer: string;
  aiTone: string | null;
};

export function DiaryPage({
  diary,
  moodColor,
  moodX,
  moodY,
  cards,
  photos,
  voiceTranscript,
  oneAnswer,
  aiTone,
}: Props) {
  const navigate = useNavigate();
  const awardCoinsFn = useServerFn(awardCoins);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const today = new Date().toISOString().slice(0, 10);

      // Pull current user stats
      const { data: userRow } = await supabase
        .from("users")
        .select("streak, longest_streak, coins, total_sessions, level")
        .eq("id", u.user.id)
        .maybeSingle();

      const prevStreak = userRow?.streak ?? 0;
      const newStreak = prevStreak + 1;
      const newCoins = (userRow?.coins ?? 0) + diary.coins_earned;
      const newSessions = (userRow?.total_sessions ?? 0) + 1;
      const newLongest = Math.max(userRow?.longest_streak ?? 0, newStreak);
      const newLevel = Math.max(1, Math.floor(newCoins / 200) + 1);

      const { error: insertErr } = await supabase.from("diary_entries").upsert(
        {
          user_id: u.user.id,
          date: today,
          title: diary.title,
          content: diary.content,
          mood_color: moodColor,
          mood_x: moodX,
          mood_y: moodY,
          ai_tone: aiTone,
          cards_swiped: cards as never,
          photos: photos as never,
          voice_transcript: voiceTranscript || null,
          one_answer: oneAnswer || null,
          ai_insight: diary.ai_insight,
          focus_word: diary.focus_word,
          one_thing: diary.one_thing,
          tomorrow_plan: {
            morning_mission: diary.morning_mission,
            focus_word: diary.focus_word,
            one_thing: diary.one_thing,
            energy_forecast: diary.energy_forecast,
            tonight_intention: diary.tonight_intention,
          } as never,
          coins_earned: diary.coins_earned,
          is_private: true,
        },
        { onConflict: "user_id,date" },
      );
      if (insertErr) throw insertErr;

      await supabase
        .from("users")
        .update({
          streak: newStreak,
          longest_streak: newLongest,
          coins: newCoins,
          total_sessions: newSessions,
          level: newLevel,
        })
        .eq("id", u.user.id);

      try {
        await awardCoinsFn({ data: { amount: diary.coins_earned, reason: "Daily session completed" } });
      } catch (e) {
        console.error("awardCoins failed", e);
      }

      setSaved(true);
      setConfetti(true);
      toast.success(`Day ${newSessions} complete 🏆  +${diary.coins_earned} coins`);
      setTimeout(() => setConfetti(false), 2400);
    } catch (e) {
      console.error(e);
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      {/* Page flip reveal */}
      <motion.div
        initial={{ rotateY: -90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1400, transformOrigin: "left center" }}
        className="mx-auto max-w-2xl px-6 py-10 md:py-14"
      >
        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.45em] text-gold-light/80">
          {dateLabel}
        </p>
        <div
          className="mt-3 h-[3px] rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${moodColor} 30%, ${moodColor} 70%, transparent)`,
            boxShadow: `0 0 18px ${moodColor}`,
          }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              border: "1px solid rgba(240,201,106,0.35)",
              background: "rgba(22,22,31,0.6)",
            }}
          >
            <span className="text-base leading-none">{diary.mood_emoji}</span>
            <span className="text-gold-light italic">{diary.mood_label}</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-gold-light"
            style={{
              border: "1px solid rgba(240,201,106,0.5)",
              background:
                "linear-gradient(160deg, rgba(240,201,106,0.18), rgba(22,22,31,0.6))",
            }}
          >
            +{diary.coins_earned} coins ✨
          </span>
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-10 text-center font-display tracking-tight text-3xl md:text-5xl text-gold-light"
          style={{ textShadow: "0 0 36px rgba(240,201,106,0.35)" }}
        >
          {diary.title}
        </motion.h1>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-10 pl-5 whitespace-pre-line"
          style={{
            borderLeft: "3px solid rgba(240,201,106,0.55)",
            fontFamily: "Georgia, 'Times New Roman', serif",
            lineHeight: 1.9,
            color: "rgba(255,255,255,0.85)",
            fontSize: "17px",
          }}
        >
          {diary.content}
        </motion.div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mt-10 space-y-6">
            {photos.map((url, i) => (
              <figure key={url + i}>
                <img
                  src={url}
                  alt="Memory of today"
                  className="w-full rounded-2xl"
                  style={{
                    boxShadow:
                      "0 18px 50px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(240,201,106,0.18)",
                  }}
                />
                <figcaption
                  className="mt-3 italic text-sm text-muted-foreground text-center"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  A frame that held something you didn't have to explain.
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* AI Insight box */}
        <div
          className="mt-12 rounded-2xl p-5"
          style={{
            background: "rgba(240,201,106,0.08)",
            border: "1px solid rgba(240,201,106,0.4)",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80">
            ◎ ALIVE noticed
          </p>
          <p
            className="mt-2 text-base text-foreground/90 italic"
            style={{ fontFamily: "Georgia, serif", lineHeight: 1.7 }}
          >
            {diary.ai_insight}
          </p>
        </div>

        {/* Tomorrow divider */}
        <div className="mt-16 flex items-center gap-4">
          <div className="flex-1 h-px bg-gold/30" />
          <p className="text-[10px] uppercase tracking-[0.5em] text-gold-light/80">
            Tomorrow
          </p>
          <div className="flex-1 h-px bg-gold/30" />
        </div>

        {/* Tomorrow cards */}
        <div className="mt-8 grid grid-cols-1 gap-4">
          <TomorrowCard icon="🌅" title="Morning Mission" body={diary.morning_mission} />
          <FocusWordCard word={diary.focus_word} />
          <TomorrowCard icon="🎯" title="The One Thing" body={diary.one_thing} />
          <TomorrowCard
            icon="📊"
            title="Energy Forecast"
            body={diary.energy_forecast}
          />
          <TomorrowCard
            icon="💭"
            title="Tonight's Intention"
            body={diary.tonight_intention}
          />
          {diary.relationship_nudge && (
            <TomorrowCard icon="🤍" title="Relationship Nudge" body={diary.relationship_nudge} />
          )}
          {diary.body_signal && (
            <TomorrowCard icon="🌿" title="Body Signal" body={diary.body_signal} />
          )}
        </div>

        {/* Actions */}
        <div className="mt-12 mb-10 space-y-3">
          <GoldButton
            type="button"
            disabled={saving || saved}
            onClick={() => save()}
          >
            {saved ? "Saved to Vault" : saving ? "Saving…" : "🔐 Save to My Vault"}
          </GoldButton>
          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70 pt-2">
            One more page in your life archive.
          </p>
          {saved && (
            <button
              type="button"
              onClick={() => navigate({ to: "/vault" })}
              className="w-full text-xs tracking-[0.3em] uppercase text-muted-foreground hover:text-gold-light transition py-3"
            >
              Close → My Vault
            </button>
          )}
        </div>
      </motion.div>



      {confetti && <ConfettiBurst />}
    </div>
  );
}

function TomorrowCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 relative"
      style={{
        background: "linear-gradient(180deg, rgba(28,28,40,0.95), rgba(18,18,28,0.95))",
        border: "1px solid rgba(240,201,106,0.18)",
        borderTop: "2px solid rgba(240,201,106,0.55)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-lg leading-none">{icon}</span>
        <p className="text-[10px] uppercase tracking-[0.35em] text-gold-light/85">
          {title}
        </p>
      </div>
      <p
        className="text-sm text-foreground/85 leading-relaxed"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {body}
      </p>
    </div>
  );
}

function FocusWordCard({ word }: { word: string }) {
  return (
    <div
      className="rounded-2xl p-6 text-center relative"
      style={{
        background:
          "linear-gradient(160deg, rgba(240,201,106,0.18), rgba(22,22,31,0.9))",
        border: "1px solid rgba(240,201,106,0.35)",
        borderTop: "2px solid rgba(240,201,106,0.6)",
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-lg leading-none">⚡</span>
        <p className="text-[10px] uppercase tracking-[0.35em] text-gold-light/85">
          Focus Word
        </p>
      </div>
      <p
        className="font-display text-3xl md:text-4xl text-gold-light italic"
        style={{ textShadow: "0 0 24px rgba(240,201,106,0.4)" }}
      >
        {word}
      </p>
    </div>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 60 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 1.6 + Math.random() * 1.2;
        const rot = Math.random() * 360;
        const size = 6 + Math.random() * 6;
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: "110vh", rotate: rot + 720, opacity: [1, 1, 0] }}
            transition={{ duration, delay, ease: "easeIn" }}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: "-10px",
              width: size,
              height: size * 0.4,
              background:
                Math.random() > 0.5
                  ? "linear-gradient(180deg, #FFE8A8, #C9A84C)"
                  : "linear-gradient(180deg, #F0C96A, #8B6914)",
              borderRadius: 2,
              boxShadow: "0 0 8px rgba(240,201,106,0.6)",
            }}
          />
        );
      })}
    </div>
  );
}
