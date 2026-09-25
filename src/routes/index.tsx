import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  Sparkles,
  BookOpen,
  Compass,
  Gamepad2,
  Camera,
  Lock,
  Users,
  CircleDot,
  Check,
} from "lucide-react";
import { GoldParticles, Reveal } from "@/components/landing/atmos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALIVE — Prove it. Daily." },
      {
        name: "description",
        content:
          "5 minutes. One conversation. A lifetime of knowing yourself. ALIVE is the daily ritual that turns ordinary days into your story.",
      },
      { property: "og:title", content: "ALIVE — Prove it. Daily." },
      {
        property: "og:description",
        content: "5 minutes. One conversation. A lifetime of knowing yourself.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative bg-background text-foreground overflow-hidden">
      <Hero />
      <HowItWorks />
      <Features />
      <Promise />
      <Pricing />
      <Footer />
    </div>
  );
}

/* ====================== HERO ====================== */

function Hero() {
  // Word-by-word reveal
  const [step, setStep] = useState(0); // 0:nothing 1:"You are" 2:"ALIVE" 3:"Prove it. Daily." 4:subtext+CTAs
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2800),
      setTimeout(() => setStep(4), 3900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 isolate">
      {/* Vignette glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, oklch(0.74 0.12 85 / 0.18), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 110%, oklch(0 0 0 / 0.9), transparent 60%)",
        }}
      />
      <GoldParticles density={70} />

      <div className="relative z-10 max-w-3xl text-center">
        <p
          className={`text-[10px] md:text-xs uppercase tracking-[0.5em] text-gold/70 mb-8 transition-opacity duration-700 ${
            step >= 1 ? "opacity-100" : "opacity-0"
          }`}
        >
          A daily ritual · Est. 2026
        </p>

        <h1 className="font-display leading-[0.95] tracking-tight">
          <span
            className={`block text-foreground/90 text-3xl md:text-5xl font-light italic transition-all duration-[1100ms] ${
              step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            You are
          </span>
          <span
            className={`block my-3 md:my-4 text-[clamp(5rem,18vw,11rem)] font-bold tracking-tight transition-all duration-[1200ms] ${
              step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{
              backgroundImage:
                "linear-gradient(100deg, #C9A84C 0%, #F0C96A 30%, #FFE8A8 50%, #F0C96A 70%, #C9A84C 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: step >= 2 ? "alive-shimmer 4s ease-in-out infinite" : "none",
              filter: "drop-shadow(0 0 40px rgba(201,168,76,0.35))",
            }}
          >
            ALIVE
          </span>
          <span
            className={`block text-foreground/90 text-2xl md:text-4xl font-light italic transition-all duration-[1100ms] ${
              step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Prove it.{" "}
            <span className="text-gold-light not-italic font-normal">Daily.</span>
          </span>
        </h1>

        <p
          className={`mt-10 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed transition-all duration-[1100ms] ${
            step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Capture life. Understand life.
          <br className="hidden sm:block" />
          Preserve life. Pass it on.
        </p>

        <div
          className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center transition-all duration-[1100ms] delay-150 ${
            step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Link
            to="/auth"
            className="group inline-flex items-center justify-center rounded-[14px] bg-gradient-gold px-9 py-4 font-medium text-primary-foreground tracking-wide shadow-premium hover:scale-[1.02] transition-transform"
          >
            Begin Your Story
            <Sparkles className="ml-2 h-4 w-4 opacity-80 group-hover:opacity-100" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center justify-center rounded-[14px] border border-gold/40 bg-transparent px-9 py-4 text-foreground tracking-wide hover:border-gold hover:bg-gold/5 transition-colors"
          >
            Watch how it works
          </a>
        </div>
      </div>

      <a
        href="#how"
        aria-label="Scroll"
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-gold transition-opacity duration-1000 ${
          step >= 4 ? "opacity-80 hover:opacity-100" : "opacity-0"
        }`}
        style={{ animation: "alive-bounce 2.4s ease-in-out infinite" }}
      >
        <ArrowDown className="h-6 w-6" strokeWidth={1.5} />
      </a>

      <style>{`
        @keyframes alive-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes alive-bounce {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, 10px); }
        }
      `}</style>
    </section>
  );
}

/* ====================== HOW IT WORKS ====================== */

function HowItWorks() {
  const steps = [
    {
      label: "The Session",
      icon: <GoldOrb />,
      body: "Swipe through your day in 60 seconds. No blank page. No pressure. Just you and ALIVE.",
    },
    {
      label: "The Story",
      icon: <BookOpen className="h-8 w-8 text-gold" strokeWidth={1.3} />,
      body: "AI writes your diary in your voice. Literary. Emotional. Specific to you. Not a summary — your actual story.",
    },
    {
      label: "The Plan",
      icon: <Compass className="h-8 w-8 text-gold" strokeWidth={1.3} />,
      body: "Tomorrow's mission delivered. Your pattern revealed. Your growth tracked.",
    },
  ];

  return (
    <section id="how" className="relative py-32 md:py-40 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-20">
          <p className="text-xs uppercase tracking-[0.5em] text-gold/70 mb-4">
            How it works
          </p>
          <h2 className="font-display text-4xl md:text-6xl tracking-tight">
            Three quiet acts.{" "}
            <span className="italic text-gold-light">Every night.</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.label} delay={i * 140}>
              <article className="group relative h-full rounded-[14px] border border-border bg-card p-8 md:p-10 shadow-premium overflow-hidden transition-transform hover:-translate-y-1">
                <div
                  aria-hidden
                  className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(201,168,76,0.25), transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-6">
                    Step 0{i + 1}
                  </div>
                  <div className="mb-8 flex items-center justify-start h-12">{s.icon}</div>
                  <h3 className="font-display text-2xl md:text-3xl mb-4 text-foreground">
                    {s.label}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GoldOrb() {
  return (
    <div
      className="h-10 w-10 rounded-full"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, #FFE8A8, #F0C96A 35%, #C9A84C 65%, #6b5424 100%)",
        boxShadow:
          "0 0 24px rgba(240,201,106,0.55), inset 0 -4px 8px rgba(0,0,0,0.4)",
      }}
    />
  );
}

/* ====================== FEATURES ====================== */

function Features() {
  const items = [
    {
      icon: <Gamepad2 className="h-6 w-6" strokeWidth={1.5} />,
      title: "Feels Like a Game",
      body: "Swipe cards, drop a memory, answer one question. No streaks, no guilt: just your own words, kept.",
    },
    {
      icon: <Camera className="h-6 w-6" strokeWidth={1.5} />,
      title: "Share Your Memories",
      body: "Drop photos from your day. AI reads them and learns your world.",
    },
    {
      icon: <Lock className="h-6 w-6" strokeWidth={1.5} />,
      title: "Privacy Is Sacred",
      body: "End-to-end encrypted. We have never read your diary. We never will.",
    },
    {
      icon: <Users className="h-6 w-6" strokeWidth={1.5} />,
      title: "Built For Families",
      body: "Parent voices. Child safety. Grandparent wisdom. All in one vault.",
    },
    {
      icon: <CircleDot className="h-6 w-6" strokeWidth={1.5} />,
      title: "Knows You Deeply",
      body: "Pattern recognition across months. Predicts your week before it happens.",
    },
    {
      icon: <BookOpen className="h-6 w-6" strokeWidth={1.5} />,
      title: "Annual Life Book",
      body: "Every year, ALIVE compiles your best entries, memories, mood patterns, and photos into a beautiful digital book.",
    },
  ];

  return (
    <section className="relative py-32 md:py-40 px-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, oklch(0.74 0.12 85 / 0.05), transparent 70%)",
        }}
      />
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-20">
          <p className="text-xs uppercase tracking-[0.5em] text-gold/70 mb-4">
            What lives inside
          </p>
          <h2 className="font-display text-4xl md:text-6xl tracking-tight">
            Six reasons it{" "}
            <span className="italic text-gold-light">stays with you.</span>
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 90}>
              <div className="group h-full rounded-[14px] border border-border bg-card p-7 transition-all hover:border-gold/40 hover:-translate-y-1">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gold/10 text-gold mb-6 group-hover:bg-gold/20 transition-colors">
                  {it.icon}
                </div>
                <h3 className="font-display text-2xl mb-3 text-foreground">
                  {it.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  {it.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====================== THE PROMISE ====================== */

function Promise() {
  return (
    <section className="relative py-28 md:py-40 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="relative py-16 md:py-24 text-center">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <p className="text-xs uppercase tracking-[0.5em] text-gold/70 mb-8">
              The promise
            </p>
            <p className="font-display text-2xl md:text-4xl leading-[1.4] text-foreground">
              We will never sell your data.
              <br />
              <span className="italic text-muted-foreground">Not today.</span>{" "}
              <span className="italic text-muted-foreground">
                Not when we are worth a billion dollars.
              </span>
              <br />
              <span className="text-gold">Not ever.</span>
            </p>
            <div className="mt-12 mx-auto w-12 h-px bg-gold/40" />
            <p className="mt-12 font-display text-xl md:text-2xl italic text-foreground/85">
              Your diary is yours.
              <br />
              We are just the keepers.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ====================== PRICING ====================== */

function Pricing() {
  const tiers = [
    {
      name: "Seedling",
      emoji: "🌱",
      price: "Free",
      period: "",
      cta: "Start Free",
      featured: false,
      features: [
        "30-day history",
        "Basic AI diary",
        "Daily session",
        "Mood tracking",
      ],
    },
    {
      name: "Soul",
      emoji: "🏆",
      price: "$9",
      period: "/month",
      cta: "Most Popular",
      featured: true,
      features: [
        "Unlimited history",
        "Full AI insights",
        "Photo memories",
        "Pattern recognition",
        "Family member (1 child)",
        "Weekly deep report",
      ],
    },
    {
      name: "ALIVE",
      emoji: "✨",
      price: "$19",
      period: "/month",
      cta: "Go Fully Alive",
      featured: false,
      features: [
        "Everything in Soul",
        "Unlimited family members",
        "Voice of loved ones",
        "Legacy letters",
        "Annual Life Book",
        "Memory search unlimited",
      ],
    },
  ];

  return (
    <section className="relative py-32 md:py-40 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-20">
          <p className="text-xs uppercase tracking-[0.5em] text-gold/70 mb-4">
            Pricing
          </p>
          <h2 className="font-display text-4xl md:text-6xl tracking-tight">
            Three ways to{" "}
            <span className="italic text-gold-light">come alive.</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 120}>
              <div
                className={[
                  "relative h-full rounded-[14px] p-8 md:p-10 flex flex-col transition-transform hover:-translate-y-1",
                  t.featured
                    ? "bg-card border-2 border-gold shadow-premium md:scale-[1.03]"
                    : "bg-card border border-border shadow-premium",
                ].join(" ")}
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-[10px] tracking-[0.4em] uppercase bg-gradient-gold text-primary-foreground rounded-full font-medium">
                      Most Loved
                    </span>
                  </div>
                )}
                <div className="text-3xl mb-4" aria-hidden>
                  {t.emoji}
                </div>
                <h3 className="font-display text-3xl mb-2 text-foreground">{t.name}</h3>
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="font-display text-5xl text-gold">{t.price}</span>
                  <span className="text-muted-foreground">{t.period}</span>
                </div>
                <ul className="space-y-3 mb-10 flex-1">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-[15px] text-foreground/85"
                    >
                      <Check className="h-4 w-4 mt-1 text-gold shrink-0" strokeWidth={2.2} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className={[
                    "inline-flex items-center justify-center rounded-[14px] px-6 py-3 font-medium tracking-wide transition-all",
                    t.featured
                      ? "bg-gradient-gold text-primary-foreground hover:scale-[1.02]"
                      : "border border-gold/40 text-foreground hover:border-gold hover:bg-gold/5",
                  ].join(" ")}
                >
                  {t.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ====================== FOOTER ====================== */

function Footer() {
  return (
    <footer className="relative border-t border-border py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 items-start md:items-center justify-between">
        <div>
          <div className="font-display text-3xl tracking-[0.35em] text-gold">
            ALIVE
          </div>
          <p className="mt-3 font-display italic text-muted-foreground">
            Your reflection. Your memory. Your legacy.
          </p>
        </div>
        <nav className="flex flex-wrap gap-8 text-sm text-muted-foreground">
          <Link to="/transparency" className="hover:text-gold-light transition-colors">
            Transparency
          </Link>
          <Link to="/pricing" className="hover:text-gold-light transition-colors">
            Plans
          </Link>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-border/60 text-xs uppercase tracking-[0.3em] text-muted-foreground/70 text-center">
        No ads. Ever. © 2026 ALIVE
      </div>
    </footer>
  );
}
