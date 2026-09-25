import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: "Transparency — ALIVE" },
      {
        name: "description",
        content: "Exactly what Alive can and can't see, what leaves your device, and when.",
      },
    ],
  }),
  component: TransparencyPage,
});

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: "Your entries are encrypted on your device",
    points: [
      "Everything you write, record, photograph or attach is encrypted in your browser with a key made from your password, before it is uploaded.",
      "Your password never leaves your device. Our sign-in service receives a different value derived from it.",
      "Our servers store only encrypted data. We cannot read your entries, file names, voice notes or photos from our own database.",
      "Your own AI key, if you add one, is encrypted the same way.",
    ],
  },
  {
    title: "When text leaves your device, and why",
    points: [
      "Only when an AI feature needs it: filing your entries into topics, answering an Ask question, building your morning brief, Coach, Timeline and Insights.",
      "Only the entries that one request needs are sent, with their dates, over an encrypted connection. They are used for that request and not stored by Alive.",
      "With your own key, the request goes to your AI provider under your account and their terms. On a paid plan, it goes through Alive's AI provider.",
      "We do not train AI on your entries.",
    ],
  },
  {
    title: "Voice and files stay on your device to be read",
    points: [
      "Voice notes are transcribed in your browser. The recording is never sent to a transcription service.",
      "Text inside PDFs and Word files is read in your browser, then encrypted like everything else.",
    ],
  },
  {
    title: "What the AI is not allowed to do",
    points: [
      "Say anything it can't quote from your own words, with the date. Anything it can't cite is dropped on your device before you see it.",
      "Ask whether you did something, predict how a day will feel, or comment on your health.",
    ],
  },
  {
    title: "If you lose your password and recovery code",
    points: [
      "Nobody can recover your entries, including us. Keep your recovery code somewhere safe; with it you can set a new password and keep everything.",
    ],
  },
  {
    title: "What this does not yet cover",
    points: [
      "AI features run on AI providers' servers, so the text for each request is visible to that provider while it's processed. Moving this onto your device is what a native app is for.",
      "The morning brief reminder email contains no diary content, only a link, because we can't read your brief.",
      "The times of your entries, their sizes and which features you use are visible to us; their content is not.",
    ],
  },
];

function TransparencyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-foreground">
      <div className="mx-auto max-w-2xl px-5 pt-14 pb-24">
        <Link to="/" className="font-display text-lg tracking-[0.4em] text-gold">
          ALIVE
        </Link>
        <h1 className="mt-8 font-display text-4xl text-gold-light tracking-tight">Transparency</h1>
        <p className="mt-3 text-muted-foreground" style={{ fontFamily: "Georgia, serif" }}>
          Plainly: what we can and can't see, what leaves your device, and when.
        </p>
        {SECTIONS.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="font-display text-xl text-gold-light">{s.title}</h2>
            <ul
              className="mt-3 space-y-2 text-[15px] leading-relaxed text-foreground/85"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {s.points.map((p) => (
                <li key={p} className="pl-4 border-l border-gold/30">
                  {p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
