import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({ meta: [{ title: "Today — ALIVE" }] }),
  component: TodayPage,
});

type Entry = {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  created_at: string;
};

function TodayPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("diary_entries")
      .select("id,date,title,content,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) toast.error(error.message);
    else setEntries(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!content.trim()) {
      toast.error("Write something first.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData.user?.id;
    if (!user_id) { setSaving(false); return; }

    const { error } = await supabase.from("diary_entries").insert({
      user_id,
      title: title || null,
      content,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setTitle("");
    setContent("");
    toast.success("Captured.");
    load();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Today</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">
          What is alive in you right now?
        </h1>
        <p className="mt-3 text-muted-foreground italic">
          A few honest sentences. No one is watching.
        </p>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-6 shadow-premium space-y-4">
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent border-0 border-b border-border rounded-none px-0 font-display text-2xl focus-visible:ring-0 focus-visible:border-gold"
        />
        <Textarea
          placeholder="Begin here…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="bg-transparent border-0 px-0 resize-none focus-visible:ring-0 text-base leading-relaxed"
        />
        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            {saving ? "Saving…" : "Capture"}
          </Button>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-foreground mb-6">Recent reflections</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground italic">Your story will live here.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((e) => (
              <li key={e.id} className="rounded-[14px] border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg text-gold-light">
                    {e.title || "Untitled"}
                  </h3>
                  <span className="text-xs text-muted-foreground tracking-wider uppercase">
                    {new Date(e.created_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {e.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
