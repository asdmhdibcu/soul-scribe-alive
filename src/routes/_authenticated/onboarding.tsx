import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { encryptJson } from "@/lib/crypto";
import { saveCapture, saveTranscript } from "@/lib/moments";
import { transcribeAudio } from "@/lib/voice/transcribe";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { GoldParticles } from "@/components/landing/atmos";
import {
  profileMomentText,
  profileReady,
  yesterdayEvening,
  type Profile,
} from "@/lib/profile-model";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — ALIVE" }] }),
  component: OnboardingPage,
});

const field =
  "mt-2 w-full rounded-[14px] bg-[#0A0A0F] px-4 py-3 text-[15px] text-foreground outline-none";
const border = { border: "1px solid rgba(240,201,106,0.2)" };

/**
 * About two minutes: a short profile (name, what's going on, brief time are
 * required), then "tell me about yesterday" so the first brief has two days
 * to draw from. Everything is encrypted on this device.
 */
function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"profile" | "yesterday">("profile");
  const [profile, setProfile] = useState<Profile>({
    name: "",
    goingOn: "",
    briefHour: 7,
    work: "",
    people: "",
    goals: "",
  });
  const [more, setMore] = useState(false);
  const [yesterday, setYesterday] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const n = (data.user?.user_metadata?.name as string | undefined) ?? "";
      if (n) setProfile((p) => ({ ...p, name: p.name || n }));
    });
  }, []);

  const set = (k: keyof Profile) => (v: string | number) => setProfile((p) => ({ ...p, [k]: v }));

  async function saveProfile() {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_prefs").upsert(
        {
          user_id: u.user.id,
          brief_hour: profile.briefHour,
          timezone,
          profile_enc: await encryptJson(profile),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      await supabase.from("users").update({ name: profile.name.trim() }).eq("id", u.user.id);
      await saveCapture({
        id: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
        text: profileMomentText(profile),
        photos: [],
        files: [],
      });
      setStep("yesterday");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(skip: boolean) {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (!skip && (yesterday.trim() || audio)) {
        const id = crypto.randomUUID();
        await saveCapture({
          id,
          capturedAt: yesterdayEvening(new Date()),
          text: yesterday,
          photos: [],
          files: [],
          audio,
        });
        if (audio) {
          const blob = audio;
          void transcribeAudio(blob).then(({ text }) =>
            text ? saveTranscript(id, yesterday, text) : undefined,
          );
        }
      }
      await supabase.from("users").update({ onboarding_complete: true }).eq("id", u.user.id);
      navigate({ to: "/today" });
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-50">
        <GoldParticles density={24} />
      </div>
      <div className="mx-auto max-w-xl px-5 pt-12 pb-24">
        {step === "profile" ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.45em] text-gold-light/80">
              Step 1 of 2
            </p>
            <h1 className="mt-2 font-display text-3xl text-gold-light tracking-tight">
              A little about you
            </h1>
            <p className="mt-2 text-sm text-muted-foreground italic">
              So Alive can help from day one. Encrypted on this device.
            </p>

            <label className="mt-8 block text-sm text-foreground/85">
              Your name
              <input
                value={profile.name}
                onChange={(e) => set("name")(e.target.value)}
                className={field}
                style={border}
              />
            </label>
            <label className="mt-5 block text-sm text-foreground/85">
              What's going on in your life right now?
              <textarea
                value={profile.goingOn}
                onChange={(e) => set("goingOn")(e.target.value)}
                rows={4}
                placeholder="A few sentences is plenty."
                className={field}
                style={{ ...border, fontFamily: "Georgia, serif" }}
              />
            </label>
            <label className="mt-5 block text-sm text-foreground/85">
              Your morning brief is ready at
              <select
                value={profile.briefHour}
                onChange={(e) => set("briefHour")(Number(e.target.value))}
                className={field}
                style={border}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {new Date(2026, 0, 1, h).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Time zone: {timezone}
              </span>
            </label>

            {!more ? (
              <button
                type="button"
                onClick={() => setMore(true)}
                className="mt-5 text-xs uppercase tracking-[0.3em] text-gold/80 hover:text-gold-light"
              >
                Add more (optional)
              </button>
            ) : (
              <>
                <label className="mt-5 block text-sm text-foreground/85">
                  Your work <span className="text-muted-foreground">(optional)</span>
                  <input
                    value={profile.work}
                    onChange={(e) => set("work")(e.target.value)}
                    className={field}
                    style={border}
                  />
                </label>
                <label className="mt-5 block text-sm text-foreground/85">
                  People who matter to you <span className="text-muted-foreground">(optional)</span>
                  <input
                    value={profile.people}
                    onChange={(e) => set("people")(e.target.value)}
                    className={field}
                    style={border}
                  />
                </label>
                <label className="mt-5 block text-sm text-foreground/85">
                  What you're aiming for <span className="text-muted-foreground">(optional)</span>
                  <input
                    value={profile.goals}
                    onChange={(e) => set("goals")(e.target.value)}
                    className={field}
                    style={border}
                  />
                </label>
              </>
            )}

            <button
              type="button"
              disabled={busy || !profileReady(profile)}
              onClick={() => void saveProfile()}
              className="mt-8 h-12 w-full rounded-[14px] text-sm uppercase tracking-[0.2em] text-background disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.45em] text-gold-light/80">
              Step 2 of 2
            </p>
            <h1 className="mt-2 font-display text-3xl text-gold-light tracking-tight">
              Tell me about yesterday
            </h1>
            <p className="mt-2 text-sm text-muted-foreground italic">
              Type or talk. It's saved as yesterday, so tomorrow's brief has two days to draw from.
            </p>
            <textarea
              value={yesterday}
              onChange={(e) => setYesterday(e.target.value)}
              rows={6}
              placeholder="What happened, what stayed with you…"
              className={`${field} mt-6`}
              style={{ ...border, fontFamily: "Georgia, serif" }}
            />
            <div className="mt-4">
              {audio ? (
                <p className="text-sm text-gold-light">
                  Voice note recorded.{" "}
                  <button
                    type="button"
                    onClick={() => setAudio(null)}
                    className="text-muted-foreground underline"
                  >
                    Remove
                  </button>
                </p>
              ) : (
                <VoiceButton onRecorded={setAudio} />
              )}
            </div>
            <button
              type="button"
              disabled={busy || (!yesterday.trim() && !audio)}
              onClick={() => void finish(false)}
              className="mt-8 h-12 w-full rounded-[14px] text-sm uppercase tracking-[0.2em] text-background disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
            >
              Save and begin
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish(true)}
              className="mt-3 w-full text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-gold-light"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
