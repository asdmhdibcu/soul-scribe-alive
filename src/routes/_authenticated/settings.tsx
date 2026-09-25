import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";
import { AI_PROVIDERS, redactKey, type AiProvider } from "@/lib/ai-model";
import { loadOwnAi, removeOwnAi, saveOwnAi, useAiAccess } from "@/lib/ai-client";
import { BriefSettings } from "@/components/settings/BriefSettings";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ALIVE" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { plan } = useAiAccess();
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [model, setModel] = useState<string>(AI_PROVIDERS.openai.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadOwnAi().then((a) => {
      if (!a) return;
      setProvider(a.provider);
      setModel(a.model);
      setSaved(redactKey(a.apiKey));
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveOwnAi({ provider, model, apiKey });
      setSaved(redactKey(apiKey));
      setApiKey("");
      toast.success("Your AI key is saved, encrypted on this device.");
    } catch {
      toast.error("Could not save the key.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await removeOwnAi();
      setSaved(null);
      toast.success("Key removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-12 pb-24">
      <h1 className="font-display text-3xl text-gold-light tracking-tight">Settings</h1>

      <section
        className="mt-8 rounded-[14px] p-5"
        style={{ background: "#16161F", border: "1px solid rgba(240,201,106,0.2)" }}
      >
        <div className="flex items-center gap-2 text-gold-light">
          <KeyRound className="h-4 w-4" />
          <h2 className="font-display text-xl">Your own AI key</h2>
        </div>
        <p
          className="mt-2 text-sm text-foreground/80 leading-relaxed"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {plan && plan !== "free"
            ? "Your plan includes Alive's AI. You can still use your own key; if you add one, it's used instead."
            : "On the free plan, AI features (sorting, Ask, the brief, Timeline, Insights) run on your own key, so they cost you only what your AI provider charges."}
        </p>

        <form onSubmit={save} className="mt-5 space-y-4">
          <label className="block text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Provider
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as AiProvider;
                setProvider(p);
                setModel(AI_PROVIDERS[p].defaultModel);
              }}
              className="mt-2 block w-full h-11 rounded-[14px] bg-[#0A0A0F] px-3 text-sm normal-case tracking-normal text-foreground"
              style={{ border: "1px solid rgba(240,201,106,0.2)" }}
            >
              {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((p) => (
                <option key={p} value={p}>
                  {AI_PROVIDERS[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              className="mt-2 block w-full h-11 rounded-[14px] bg-[#0A0A0F] px-3 text-sm normal-case tracking-normal text-foreground"
              style={{ border: "1px solid rgba(240,201,106,0.2)" }}
            />
            <span className="mt-1 block normal-case tracking-normal text-[11px]">
              Any model your provider offers. Default: {AI_PROVIDERS[provider].defaultModel}.
            </span>
          </label>
          <label className="block text-xs uppercase tracking-[0.25em] text-muted-foreground">
            API key
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                saved ? `Saved (${saved}). Paste a new key to replace it.` : "Paste your key"
              }
              required
              className="mt-2 block w-full h-11 rounded-[14px] bg-[#0A0A0F] px-3 text-sm normal-case tracking-normal text-foreground"
              style={{ border: "1px solid rgba(240,201,106,0.2)" }}
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || !apiKey.trim()}
              className="flex-1 h-11 rounded-[14px] text-sm uppercase tracking-[0.2em] text-background disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
            >
              Save key
            </button>
            {saved && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="h-11 px-4 rounded-[14px] text-sm text-red-300"
                style={{ border: "1px solid rgba(220,80,80,0.4)" }}
              >
                Remove
              </button>
            )}
          </div>
        </form>

        <div className="mt-5 flex gap-2 text-xs text-muted-foreground leading-relaxed">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold-light/70" />
          <p>
            The key is encrypted on this device with your diary's key; Alive stores only ciphertext.
            When you use an AI feature, the key and the entries that request needs are sent over
            HTTPS for that one request and are not stored or logged.
          </p>
        </div>
      </section>

      <BriefSettings />

      <p className="mt-6 text-sm text-muted-foreground">
        <Link
          to="/import"
          className="text-gold hover:text-gold-light underline-offset-4 hover:underline"
        >
          Import old notes
        </Link>
        {" · "}
        <Link
          to="/transparency"
          className="text-gold hover:text-gold-light underline-offset-4 hover:underline"
        >
          How your data is handled
        </Link>
        {" · "}
        <Link
          to="/pricing"
          className="text-gold hover:text-gold-light underline-offset-4 hover:underline"
        >
          Compare plans
        </Link>
      </p>
    </div>
  );
}
