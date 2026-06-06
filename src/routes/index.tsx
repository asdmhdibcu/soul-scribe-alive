import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALIVE — A daily ritual of self-reflection" },
      {
        name: "description",
        content:
          "ALIVE is a daily ritual that helps you understand your life, emotions, patterns, and growth over time.",
      },
      { property: "og:title", content: "ALIVE — A daily ritual of self-reflection" },
      {
        property: "og:description",
        content: "Turn ordinary days into a story you'll want to read.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.74 0.12 85 / 0.18), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 110%, oklch(0.74 0.12 85 / 0.08), transparent 60%)",
        }}
      />

      <main className="relative max-w-3xl mx-auto px-6 pt-24 pb-32 text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-muted-foreground">
          A daily ritual
        </p>

        <h1 className="mt-6 font-display text-[clamp(3.5rem,10vw,6.5rem)] leading-[0.95] tracking-tight">
          <span className="text-gold">ALIVE</span>
        </h1>

        <p className="mt-8 font-display italic text-xl md:text-2xl text-foreground/90 leading-relaxed">
          Your life is a story.
          <br />
          This is where you finally read it.
        </p>

        <p className="mt-6 max-w-xl mx-auto text-muted-foreground leading-relaxed">
          Five quiet minutes a day. A mood, a memory, a moment. ALIVE turns
          ordinary days into a record of who you were, who you are, and who you
          are becoming.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-[14px] bg-gradient-gold px-8 py-3 font-medium text-primary-foreground tracking-wide shadow-premium hover:opacity-95 transition-opacity"
          >
            Begin your story
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-[14px] border border-border bg-card px-8 py-3 text-foreground hover:border-gold transition-colors"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            {
              k: "Reflect",
              t: "One honest sentence",
              d: "A single prompt designed to reach beneath the surface.",
            },
            {
              k: "Remember",
              t: "Your years, recovered",
              d: "Moods, photos, voices — quietly woven into something lasting.",
            },
            {
              k: "Reveal",
              t: "Patterns made visible",
              d: "See what gives you energy, what drains it, what keeps returning.",
            },
          ].map((f) => (
            <div
              key={f.k}
              className="rounded-[14px] border border-border bg-card p-6 shadow-premium"
            >
              <p className="text-[11px] uppercase tracking-[0.35em] text-gold">
                {f.k}
              </p>
              <h3 className="mt-3 font-display text-xl text-foreground">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.d}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-20 text-xs uppercase tracking-[0.4em] text-muted-foreground">
          The smallest moments often change lives
        </p>
      </main>
    </div>
  );
}
