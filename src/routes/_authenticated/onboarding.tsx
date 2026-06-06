import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoldButton } from "@/components/auth/AuthShell";
import { GoldParticles } from "@/components/landing/atmos";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — ALIVE" }] }),
  component: OnboardingPage,
});

const TOTAL_STEPS = 5;

const INTENTS = [
  { icon: "🪞", label: "Know myself deeply" },
  { icon: "📈", label: "Build powerful habits" },
  { icon: "🏆", label: "Become the best version of me" },
  { icon: "🧠", label: "Understand my patterns" },
  { icon: "💭", label: "Process my emotions" },
  { icon: "👨‍👩‍👧", label: "Connect with my family" },
  { icon: "💰", label: "Monetize my story" },
  { icon: "🕌", label: "Grow spiritually" },
  { icon: "🎯", label: "Achieve my goals" },
  { icon: "😴", label: "Improve my wellbeing" },
  { icon: "📸", label: "Capture my memories" },
  { icon: "✍️", label: "Just write beautifully" },
];

const RHYTHMS = [
  { icon: "🌅", title: "Morning Person", desc: "Start the day with clarity", window: "6am – 9am", time: "07:00" },
  { icon: "☀️", title: "Midday Checker", desc: "Reset at lunch", window: "12pm – 2pm", time: "13:00" },
  { icon: "🌆", title: "Evening Unwinder", desc: "Process the day", window: "7pm – 9pm", time: "20:00" },
  { icon: "🌙", title: "Night Owl", desc: "When the world is quiet", window: "10pm – 12am", time: "23:00" },
];

const TONES = [
  { id: "coach", icon: "🏆", title: "The Coach", desc: "Push me. Challenge me. Don't let me make excuses." },
  { id: "friend", icon: "🤗", title: "The Friend", desc: "Listen. Understand. Never judge." },
  { id: "mirror", icon: "🪞", title: "The Mirror", desc: "Just reflect me back. Help me see myself clearly." },
  { id: "guide", icon: "🕌", title: "The Guide", desc: "Connect my days to something bigger. Faith first." },
  { id: "motivator", icon: "⚡", title: "The Motivator", desc: "Hype me up. Remind me who I am." },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState<string>("friend");
  const [intents, setIntents] = useState<string[]>([]);
  const [rhythm, setRhythm] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [tone, setTone] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const n =
        (data.user?.user_metadata?.name as string | undefined) ??
        data.user?.email?.split("@")[0] ??
        "friend";
      setName(n.split(" ")[0]);
    })();
  }, []);

  const canContinue =
    (step === 0) ||
    (step === 1 && intents.length > 0) ||
    (step === 2 && (rhythm !== null || (useCustom && customTime))) ||
    (step === 3 && tone !== null) ||
    step === 4;

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  async function finish() {
    setFinishing(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      navigate({ to: "/auth" });
      return;
    }
    const reminder_time =
      useCustom && customTime
        ? customTime
        : RHYTHMS.find((r) => r.title === rhythm)?.time ?? null;

    // fetch current coins
    const { data: row } = await supabase
      .from("users")
      .select("coins")
      .eq("id", u.user.id)
      .maybeSingle();

    const newCoins = (row?.coins ?? 0) + 50;

    await supabase
      .from("users")
      .update({
        onboarding_complete: true,
        intents,
        ai_tone: tone,
        reminder_time,
        coins: newCoins,
      })
      .eq("id", u.user.id);

    await supabase.from("coins_history").insert({
      user_id: u.user.id,
      amount: 50,
      reason: "Completed onboarding",
    });

    toast.success("You earned 50 coins! 🌟", {
      description: "Welcome to ALIVE. Your story begins now.",
    });
    navigate({ to: "/today" });
  }

  return (
    <div className="relative min-h-[100svh] bg-background text-foreground overflow-hidden isolate flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, oklch(0.74 0.12 85 / 0.12), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 120%, oklch(0 0 0 / 0.9), transparent 60%)",
        }}
      />
      <GoldParticles density={40} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <button
          onClick={back}
          disabled={step === 0 || finishing}
          aria-label="Back"
          className="h-10 w-10 rounded-full border border-gold/25 flex items-center justify-center text-gold-light disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/5 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === step ? 28 : 8,
                background:
                  i <= step
                    ? "linear-gradient(90deg, #C9A84C, #F0C96A)"
                    : "rgba(201,168,76,0.18)",
                boxShadow: i === step ? "0 0 12px rgba(240,201,106,0.5)" : undefined,
              }}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            {step === 0 && <StepWelcome name={name} onNext={next} />}
            {step === 1 && (
              <StepIntents
                selected={intents}
                onToggle={(label) =>
                  setIntents((s) =>
                    s.includes(label) ? s.filter((l) => l !== label) : [...s, label],
                  )
                }
                onNext={next}
                canContinue={canContinue}
              />
            )}
            {step === 2 && (
              <StepRhythm
                selected={rhythm}
                onSelect={(t) => {
                  setRhythm(t);
                  setUseCustom(false);
                }}
                useCustom={useCustom}
                setUseCustom={setUseCustom}
                customTime={customTime}
                setCustomTime={setCustomTime}
                onNext={next}
                canContinue={canContinue}
              />
            )}
            {step === 3 && (
              <StepTone
                selected={tone}
                onSelect={setTone}
                onNext={next}
                canContinue={canContinue}
              />
            )}
            {step === 4 && <StepPromise onFinish={finish} loading={finishing} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- STEP 1 ---------- */
function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  const lines = [
    `Welcome to ALIVE, ${name}.`,
    "Your story starts right now.",
    "Let's set you up in 2 minutes.",
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 600 : 1400);
    return () => clearTimeout(t);
  }, [shown, lines.length]);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Gold orb */}
      <motion.div
        className="relative mb-12"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <motion.div
          className="h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #FFE8A8 0%, #F0C96A 35%, #C9A84C 65%, rgba(201,168,76,0.1) 100%)",
            boxShadow:
              "0 0 80px 20px rgba(240,201,106,0.35), 0 0 160px 40px rgba(201,168,76,0.18), inset 0 -20px 40px rgba(120,80,20,0.3)",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(240,201,106,0.35)" }}
          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      <div className="min-h-[180px] space-y-5">
        {lines.slice(0, shown).map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className={
              i === 0
                ? "font-display text-3xl md:text-4xl tracking-tight"
                : "font-body text-lg md:text-xl text-muted-foreground italic"
            }
          >
            {line}
          </motion.p>
        ))}
      </div>

      <AnimatePresence>
        {shown >= lines.length && (
          <motion.div
            className="mt-12 w-full max-w-xs"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GoldButton type="button" onClick={onNext}>
              I'm Ready →
            </GoldButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- STEP 2 ---------- */
function StepIntents({
  selected,
  onToggle,
  onNext,
  canContinue,
}: {
  selected: string[];
  onToggle: (label: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <StepHeader
        title="What do you want most from ALIVE?"
        subtitle="Choose all that feel true."
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {INTENTS.map((it) => {
          const active = selected.includes(it.label);
          return (
            <button
              key={it.label}
              type="button"
              onClick={() => onToggle(it.label)}
              className="relative text-left rounded-[14px] p-4 transition-all duration-300"
              style={{
                background: active
                  ? "linear-gradient(160deg, rgba(201,168,76,0.18), rgba(22,22,31,0.6))"
                  : "rgba(22,22,31,0.65)",
                border: active
                  ? "1px solid rgba(240,201,106,0.7)"
                  : "1px solid rgba(201,168,76,0.15)",
                boxShadow: active
                  ? "0 8px 30px -10px rgba(240,201,106,0.4), inset 0 1px 0 rgba(255,232,168,0.15)"
                  : undefined,
              }}
            >
              <div className="text-2xl mb-2">{it.icon}</div>
              <div className="font-display text-[15px] leading-snug text-foreground">
                {it.label}
              </div>
              {active && (
                <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-gold flex items-center justify-center">
                  <Check className="h-3 w-3 text-background" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <ContinueButton onClick={onNext} disabled={!canContinue} />
    </div>
  );
}

/* ---------- STEP 3 ---------- */
function StepRhythm({
  selected,
  onSelect,
  useCustom,
  setUseCustom,
  customTime,
  setCustomTime,
  onNext,
  canContinue,
}: {
  selected: string | null;
  onSelect: (t: string) => void;
  useCustom: boolean;
  setUseCustom: (v: boolean) => void;
  customTime: string;
  setCustomTime: (v: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <StepHeader title="When is your best moment to reflect?" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {RHYTHMS.map((r) => {
          const active = selected === r.title && !useCustom;
          return (
            <button
              key={r.title}
              type="button"
              onClick={() => onSelect(r.title)}
              className="text-left rounded-[14px] p-5 transition-all duration-300"
              style={{
                background: active
                  ? "linear-gradient(160deg, rgba(201,168,76,0.2), rgba(22,22,31,0.6))"
                  : "rgba(22,22,31,0.65)",
                border: active
                  ? "1px solid rgba(240,201,106,0.7)"
                  : "1px solid rgba(201,168,76,0.15)",
                boxShadow: active
                  ? "0 10px 30px -10px rgba(240,201,106,0.4)"
                  : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{r.icon}</div>
                <div className="flex-1">
                  <div className="font-display text-lg text-foreground">{r.title}</div>
                  <div className="text-sm text-muted-foreground italic">{r.desc}</div>
                  <div className="text-xs text-gold/80 mt-1.5 tracking-wider uppercase">
                    {r.window}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[14px] border border-gold/15 bg-card/60 p-4 mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            className="h-4 w-4 accent-[#C9A84C]"
          />
          <span className="text-sm text-foreground">Pick a custom time</span>
        </label>
        {useCustom && (
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="mt-3 w-full bg-transparent border-b border-gold/30 px-0 py-2 text-lg text-foreground focus:outline-none focus:border-gold"
          />
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground italic mb-6">
        ALIVE will remind you gently. Never annoyingly.
      </p>

      <ContinueButton onClick={onNext} disabled={!canContinue} />
    </div>
  );
}

/* ---------- STEP 4 ---------- */
function StepTone({
  selected,
  onSelect,
  onNext,
  canContinue,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <StepHeader title="How should ALIVE speak to you?" />
      <div className="space-y-3 mb-8">
        {TONES.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className="w-full text-left rounded-[14px] p-5 transition-all duration-300"
              style={{
                background: active
                  ? "linear-gradient(160deg, rgba(201,168,76,0.2), rgba(22,22,31,0.6))"
                  : "rgba(22,22,31,0.65)",
                border: active
                  ? "1px solid rgba(240,201,106,0.7)"
                  : "1px solid rgba(201,168,76,0.15)",
                boxShadow: active
                  ? "0 10px 30px -10px rgba(240,201,106,0.4)"
                  : undefined,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{t.icon}</div>
                <div className="flex-1">
                  <div className="font-display text-xl text-foreground">{t.title}</div>
                  <div className="text-sm text-muted-foreground italic mt-1 leading-relaxed">
                    {t.desc}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <ContinueButton onClick={onNext} disabled={!canContinue} />
    </div>
  );
}

/* ---------- STEP 5 ---------- */
function StepPromise({
  onFinish,
  loading,
}: {
  onFinish: () => void;
  loading: boolean;
}) {
  const lines = [
    "Before we begin —",
    "Your diary belongs to you.",
    "We cannot read it.",
    "We will never sell it.",
    "Not for any amount of money.",
    "This is not a policy.",
    "This is who we are.",
  ];
  const [shown, setShown] = useState(0);
  const [showSeal, setShowSeal] = useState(false);

  useEffect(() => {
    if (shown < lines.length) {
      const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 500 : 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowSeal(true), 600);
    return () => clearTimeout(t);
  }, [shown, lines.length]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="space-y-3 min-h-[280px] mb-6">
        {lines.slice(0, shown).map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className={
              i === 0
                ? "font-display text-2xl md:text-3xl text-gold-light italic"
                : "font-body text-lg md:text-xl text-foreground/90"
            }
          >
            {line}
          </motion.p>
        ))}
      </div>

      <AnimatePresence>
        {showSeal && (
          <motion.div
            initial={{ scale: 2, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-10"
          >
            <motion.div
              className="h-28 w-28 rounded-full flex items-center justify-center font-display text-4xl"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #F0C96A 0%, #C9A84C 50%, #8a6f2e 100%)",
                color: "#1a1208",
                boxShadow:
                  "0 20px 50px -10px rgba(201,168,76,0.5), inset 0 -8px 20px rgba(60,40,10,0.6), inset 0 4px 10px rgba(255,232,168,0.4)",
                border: "2px solid rgba(255,232,168,0.4)",
              }}
            >
              A
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-[10px] uppercase tracking-[0.5em] text-gold/80"
            >
              Sealed
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSeal && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <GoldButton type="button" onClick={onFinish} loading={loading}>
              I Trust ALIVE — Let's Begin
            </GoldButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Shared ---------- */
function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-8">
      <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm md:text-base text-muted-foreground italic">{subtitle}</p>
      )}
    </div>
  );
}

function ContinueButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="max-w-xs mx-auto">
      <GoldButton type="button" onClick={onClick} disabled={disabled}>
        Continue →
      </GoldButton>
    </div>
  );
}
