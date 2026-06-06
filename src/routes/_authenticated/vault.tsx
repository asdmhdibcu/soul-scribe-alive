import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen,
  Coins,
  Flame,
  Lock,
  Search,
  Sparkles,
  Star,
  Tag,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoldParticles } from "@/components/landing/atmos";
import { GoldButton } from "@/components/auth/AuthShell";
import { askMemory } from "@/lib/memory-search.functions";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({ meta: [{ title: "The Vault — ALIVE" }] }),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-muted-foreground">
      Something went quiet. {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Page not found.</div>
  ),
  component: VaultPage,
});

type Filter = "all" | "private" | "favorites" | "month";

type Entry = {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  mood_color: string | null;
  mood_x: number | null;
  mood_y: number | null;
  is_private: boolean;
  coins_earned: number;
  ai_insight: string | null;
  focus_word: string | null;
  one_thing: string | null;
  tomorrow_plan: Record<string, string> | null;
  photos: string[] | null;
};

const PAGE_SIZE = 20;

function VaultPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPages: 0,
    streak: 0,
    timeCredits: 0,
    coins: 0,
    daysAlive: 0,
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [memOpen, setMemOpen] = useState(false);
  const [memQuestion, setMemQuestion] = useState("");
  const [memAnswer, setMemAnswer] = useState<string | null>(null);
  const [memLoading, setMemLoading] = useState(false);
  const ask = useServerFn(askMemory);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  // Initial stats
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: userRow }, { count }] = await Promise.all([
        supabase
          .from("users")
          .select("streak, coins, time_credits, created_at")
          .eq("id", u.user.id)
          .maybeSingle(),
        supabase
          .from("diary_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.user.id),
      ]);
      const createdAt = userRow?.created_at ? new Date(userRow.created_at) : new Date();
      const daysAlive = Math.max(
        1,
        Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      setStats({
        totalPages: count ?? 0,
        streak: userRow?.streak ?? 0,
        timeCredits: userRow?.time_credits ?? 0,
        coins: userRow?.coins ?? 0,
        daysAlive,
      });
    })();
  }, []);

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      if (nextPage === 0) setLoading(true);
      else setLoadingMore(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;

        let q = supabase
          .from("diary_entries")
          .select(
            "id, date, title, content, mood_color, mood_x, mood_y, is_private, coins_earned, ai_insight, focus_word, one_thing, tomorrow_plan, photos",
          )
          .eq("user_id", u.user.id)
          .order("date", { ascending: false })
          .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (filter === "private") q = q.eq("is_private", true);
        if (filter === "month") {
          const first = new Date();
          first.setDate(1);
          q = q.gte("date", first.toISOString().slice(0, 10));
        }
        if (debouncedSearch) {
          const term = debouncedSearch.replace(/[%_]/g, "");
          q = q.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
        }

        const { data, error } = await q;
        if (error) throw error;
        const rows = (data ?? []) as unknown as Entry[];
        setEntries((prev) => (replace ? rows : [...prev, ...rows]));
        setDone(rows.length < PAGE_SIZE);
        setPage(nextPage);
      } catch (e) {
        console.error(e);
        toast.error("Could not load your vault.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, debouncedSearch],
  );

  // Reload on filter / search
  useEffect(() => {
    setEntries([]);
    setDone(false);
    setPage(0);
    fetchPage(0, true);
  }, [filter, debouncedSearch, fetchPage]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entriesObs) => {
        if (entriesObs[0].isIntersecting && !loading && !loadingMore && !done) {
          fetchPage(page + 1);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [page, loading, loadingMore, done, fetchPage]);

  // Apply favorites filter client-side (no column yet)
  const visible = useMemo(() => {
    if (filter === "favorites") {
      try {
        const favs = JSON.parse(localStorage.getItem("alive:favs") ?? "[]") as string[];
        return entries.filter((e) => favs.includes(e.id));
      } catch {
        return [];
      }
    }
    return entries;
  }, [entries, filter]);

  async function handleAsk() {
    if (!memQuestion.trim()) return;
    setMemLoading(true);
    setMemAnswer(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("diary_entries")
        .select("date, title, content")
        .eq("user_id", u.user.id)
        .order("date", { ascending: false })
        .limit(120);
      const res = await ask({
        data: { question: memQuestion.trim(), entries: (data ?? []) as never },
      });
      setMemAnswer(res.answer);
    } catch (e) {
      console.error(e);
      toast.error("Your memory is resting. Try again.");
    } finally {
      setMemLoading(false);
    }
  }

  async function deleteEntry(id: string) {
    try {
      const { error } = await supabase.from("diary_entries").delete().eq("id", id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setStats((s) => ({ ...s, totalPages: Math.max(0, s.totalPages - 1) }));
      setActiveEntry(null);
      setConfirmDelete(null);
      toast.success("Page removed.");
    } catch {
      toast.error("Could not delete.");
    }
  }


  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.74 0.12 85 / 0.07), transparent 65%), radial-gradient(ellipse 100% 80% at 50% 110%, oklch(0 0 0 / 0.9), transparent 60%)",
        }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-60">
        <GoldParticles density={28} />
      </div>

      <div className="mx-auto max-w-5xl px-5 pt-12 pb-24">
        {/* Header */}
        <header>
          <h1 className="font-display tracking-tight text-3xl md:text-[32px] text-gold-light">
            The Vault
          </h1>
          <p className="mt-2 text-sm text-muted-foreground italic">
            {stats.totalPages} {stats.totalPages === 1 ? "page" : "pages"} written ·{" "}
            {stats.daysAlive} {stats.daysAlive === 1 ? "day" : "days"} alive
          </p>
        </header>

        {/* Stats */}
        <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<BookOpen className="h-4 w-4" />} label="Total Pages" value={stats.totalPages} />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Current Streak" value={stats.streak} suffix={stats.streak === 1 ? "day" : "days"} />
          <StatCard icon={<Timer className="h-4 w-4" />} label="Time Credits" value={stats.timeCredits} suffix="min" />
          <StatCard icon={<Coins className="h-4 w-4" />} label="Coins Earned" value={stats.coins} />
        </div>

        {/* Search */}
        <div className="mt-7 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your memories…"
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-[#16161F] text-foreground placeholder:text-muted-foreground/70 outline-none transition"
            style={{
              border: "1px solid rgba(240,201,106,0.18)",
            }}
            onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(240,201,106,0.55)")}
            onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(240,201,106,0.18)")}
          />
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          <FilterTab active={filter === "private"} onClick={() => setFilter("private")} label="Private" icon="🔐" />
          
          <FilterTab active={filter === "favorites"} onClick={() => setFilter("favorites")} label="Favorites" icon="⭐" />
          <FilterTab active={filter === "month"} onClick={() => setFilter("month")} label="This Month" />
        </div>

        {/* Memory search */}
        <div
          className="mt-5 rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(240,201,106,0.25)",
            background:
              "linear-gradient(160deg, rgba(240,201,106,0.06), rgba(22,22,31,0.6))",
          }}
        >
          <button
            type="button"
            onClick={() => setMemOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left"
          >
            <Sparkles className="h-4 w-4 text-gold-light" />
            <span className="text-sm tracking-wide text-gold-light italic">
              Ask your memory anything
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {memOpen ? "Close" : "Open"}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {memOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={memQuestion}
                      onChange={(e) => setMemQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                      placeholder="When did I last feel proud?"
                      className="flex-1 h-11 px-4 rounded-xl bg-background/70 outline-none text-sm"
                      style={{ border: "1px solid rgba(240,201,106,0.25)" }}
                    />
                    <button
                      type="button"
                      onClick={handleAsk}
                      disabled={memLoading || !memQuestion.trim()}
                      className="px-5 rounded-xl text-xs uppercase tracking-[0.2em] text-gold-light disabled:opacity-50"
                      style={{
                        border: "1px solid rgba(240,201,106,0.55)",
                        background:
                          "linear-gradient(160deg, rgba(240,201,106,0.18), rgba(22,22,31,0.6))",
                      }}
                    >
                      {memLoading ? "…" : "Ask"}
                    </button>
                  </div>
                  {memLoading && (
                    <div className="text-xs text-muted-foreground italic">
                      Walking through your pages…
                    </div>
                  )}
                  {memAnswer && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-foreground/90 leading-relaxed"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {memAnswer}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Entries */}
        <div className="mt-8">
          {loading ? (
            <SkeletonGrid />
          ) : visible.length === 0 ? (
            <EmptyState onBegin={() => navigate({ to: "/today" })} hasSearch={!!debouncedSearch || filter !== "all"} />
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {visible.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onOpen={() => setActiveEntry(entry)}
                  onDelete={() => setConfirmDelete(entry.id)}
                />
              ))}
            </div>
          )}

          {loadingMore && <div className="mt-6"><SkeletonGrid rows={2} /></div>}
          <div ref={sentinelRef} className="h-10" />
        </div>
      </div>

      {/* Entry modal */}
      <AnimatePresence>
        {activeEntry && (
          <EntryModal
            entry={activeEntry}
            onClose={() => setActiveEntry(null)}
            onDelete={() => setConfirmDelete(activeEntry.id)}
            
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-6 max-w-sm w-full text-center"
              style={{
                background: "#16161F",
                border: "1px solid rgba(240,201,106,0.35)",
              }}
            >
              <p className="font-display text-xl text-gold-light">Delete this page?</p>
              <p className="mt-2 text-sm text-muted-foreground italic">
                This memory will be gone forever.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-11 rounded-xl text-sm text-muted-foreground"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(confirmDelete)}
                  className="flex-1 h-11 rounded-xl text-sm text-red-300"
                  style={{
                    border: "1px solid rgba(220,80,80,0.5)",
                    background: "rgba(80,20,20,0.4)",
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating begin session */}
      <Link
        to="/today"
        className="fixed bottom-6 right-6 z-40 h-14 px-6 rounded-full flex items-center gap-2 text-sm tracking-[0.18em] uppercase text-background font-medium shadow-lg"
        style={{
          background: "linear-gradient(135deg, #F0C96A, #C9A84C)",
          boxShadow: "0 14px 40px -10px rgba(240,201,106,0.55)",
        }}
      >
        Today's Session
      </Link>
    </div>
  );
}

/* ────────────────────────── Pieces ────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "linear-gradient(180deg, rgba(28,28,40,0.95), rgba(18,18,28,0.95))",
        border: "1px solid rgba(240,201,106,0.18)",
      }}
    >
      <div className="flex items-center gap-2 text-gold-light/80">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.25em]">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl text-gold-light">
        {value}
        {suffix && <span className="ml-1 text-xs text-muted-foreground tracking-normal">{suffix}</span>}
      </p>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-4 h-9 rounded-full text-xs tracking-wide transition"
      style={{
        border: active
          ? "1px solid rgba(240,201,106,0.6)"
          : "1px solid rgba(240,201,106,0.18)",
        background: active
          ? "linear-gradient(160deg, rgba(240,201,106,0.22), rgba(22,22,31,0.6))"
          : "rgba(22,22,31,0.5)",
        color: active ? "#F0C96A" : "rgba(220,220,220,0.7)",
      }}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
    </button>
  );
}

function EntryCard({
  entry,
  onOpen,
  onDelete,
}: {
  entry: Entry;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const date = new Date(entry.date);
  const preview = (entry.content ?? "").trim().split("\n")[0].slice(0, 140);
  const moodColor = entry.mood_color ?? "rgba(240,201,106,0.4)";

  // Swipe to delete
  const startX = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  return (
    <div className="mb-4 break-inside-avoid relative">
      <motion.button
        type="button"
        onClick={() => {
          if (Math.abs(drag) < 6) onOpen();
          setDrag(0);
        }}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (startX.current == null) return;
          const dx = e.touches[0].clientX - startX.current;
          if (dx < 0) setDrag(Math.max(dx, -120));
        }}
        onTouchEnd={() => {
          if (drag < -90) {
            onDelete();
          }
          setDrag(0);
          startX.current = null;
        }}
        animate={{ x: drag }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="block w-full text-left rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, rgba(28,28,40,0.96), rgba(18,18,28,0.96))",
          border: "1px solid rgba(240,201,106,0.16)",
          borderLeft: `3px solid ${moodColor}`,
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <span>
              {date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <div className="flex items-center gap-1.5">
              {entry.is_private && <Lock className="h-3 w-3 text-gold-light/70" />}
            </div>
          </div>

          <h3 className="mt-2 font-display text-lg leading-snug text-gold-light tracking-tight">
            {entry.title ?? "Untitled"}
          </h3>
          {preview && (
            <p
              className="mt-2 text-sm text-foreground/75 leading-relaxed line-clamp-3"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {preview}
            </p>
          )}
        </div>
      </motion.button>

      {drag < -20 && (
        <div
          aria-hidden
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-red-300 text-xs"
        >
          <Trash2 className="h-4 w-4" />
          Release to delete
        </div>
      )}
    </div>
  );
}

function EntryModal({
  entry,
  onClose,
  onDelete,
}: {
  entry: Entry;
  onClose: () => void;
  onDelete: () => void;
}) {
  const moodColor = entry.mood_color ?? "rgba(240,201,106,0.4)";
  const date = new Date(entry.date);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("alive:favs") ?? "[]") as string[];
      setIsFav(favs.includes(entry.id));
    } catch { /* empty */ }
  }, [entry.id]);

  function toggleFav() {
    try {
      const favs = JSON.parse(localStorage.getItem("alive:favs") ?? "[]") as string[];
      const next = favs.includes(entry.id)
        ? favs.filter((id) => id !== entry.id)
        : [...favs, entry.id];
      localStorage.setItem("alive:favs", JSON.stringify(next));
      setIsFav(next.includes(entry.id));
    } catch { /* empty */ }
  }

  const plan = entry.tomorrow_plan ?? {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 top-6 rounded-t-3xl overflow-y-auto"
        style={{
          background: "linear-gradient(180deg, #0F0F18 0%, #0A0A12 100%)",
          border: "1px solid rgba(240,201,106,0.18)",
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 backdrop-blur-md bg-background/60 border-b border-gold/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold-light"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFav}
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{
                border: "1px solid rgba(240,201,106,0.25)",
                color: isFav ? "#F0C96A" : "rgba(220,220,220,0.7)",
              }}
              aria-label="Favorite"
            >
              <Star className="h-4 w-4" fill={isFav ? "#F0C96A" : "none"} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="h-9 w-9 rounded-full flex items-center justify-center text-red-300"
              style={{ border: "1px solid rgba(220,80,80,0.4)" }}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-[10px] uppercase tracking-[0.45em] text-gold-light/80">
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div
            className="mt-3 h-[3px] rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${moodColor} 30%, ${moodColor} 70%, transparent)`,
              boxShadow: `0 0 18px ${moodColor}`,
            }}
          />

          <h1
            className="mt-8 text-center font-display tracking-tight text-3xl md:text-5xl text-gold-light"
            style={{ textShadow: "0 0 36px rgba(240,201,106,0.35)" }}
          >
            {entry.title ?? "Untitled"}
          </h1>

          {entry.content && (
            <div
              className="mt-8 pl-5 whitespace-pre-line"
              style={{
                borderLeft: "3px solid rgba(240,201,106,0.55)",
                fontFamily: "Georgia, 'Times New Roman', serif",
                lineHeight: 1.9,
                color: "rgba(255,255,255,0.85)",
                fontSize: "17px",
              }}
            >
              {entry.content}
            </div>
          )}

          {entry.photos && entry.photos.length > 0 && (
            <div className="mt-8 space-y-4">
              {entry.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Memory"
                  className="w-full rounded-2xl"
                  style={{ boxShadow: "0 0 0 1px rgba(240,201,106,0.18)" }}
                />
              ))}
            </div>
          )}

          {entry.ai_insight && (
            <div
              className="mt-10 rounded-2xl p-5"
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
                {entry.ai_insight}
              </p>
            </div>
          )}

          {(plan.morning_mission || plan.focus_word || plan.one_thing) && (
            <>
              <div className="mt-12 flex items-center gap-4">
                <div className="flex-1 h-px bg-gold/30" />
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold-light/80">
                  That Tomorrow
                </p>
                <div className="flex-1 h-px bg-gold/30" />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3">
                {plan.morning_mission && <PlanCard icon="🌅" title="Morning Mission" body={plan.morning_mission} />}
                {plan.focus_word && <PlanCard icon="⚡" title="Focus Word" body={plan.focus_word} />}
                {plan.one_thing && <PlanCard icon="🎯" title="The One Thing" body={plan.one_thing} />}
                {plan.energy_forecast && <PlanCard icon="📊" title="Energy Forecast" body={plan.energy_forecast} />}
                {plan.tonight_intention && <PlanCard icon="💭" title="Tonight" body={plan.tonight_intention} />}
              </div>
            </>
          )}

          <div className="mt-10 mb-12 space-y-3">
            <button
              type="button"
              onClick={onToggleSale}
              className="w-full h-12 rounded-2xl text-sm tracking-[0.18em] uppercase text-gold-light"
              style={{
                border: "1px solid rgba(240,201,106,0.45)",
                background:
                  "linear-gradient(160deg, rgba(240,201,106,0.12), rgba(22,22,31,0.6))",
              }}
            >
              {entry.price == null ? "💰 List for Sale" : "🔐 Return to Vault"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlanCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "linear-gradient(180deg, rgba(28,28,40,0.95), rgba(18,18,28,0.95))",
        border: "1px solid rgba(240,201,106,0.18)",
        borderTop: "2px solid rgba(240,201,106,0.5)",
      }}
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold-light/80">{title}</p>
      </div>
      <p className="mt-2 text-sm text-foreground/85" style={{ fontFamily: "Georgia, serif" }}>
        {body}
      </p>
    </div>
  );
}

function SkeletonGrid({ rows = 3 }: { rows?: number }) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {Array.from({ length: rows * 3 }).map((_, i) => (
        <div
          key={i}
          className="mb-4 break-inside-avoid rounded-2xl p-4 animate-pulse"
          style={{
            background: "linear-gradient(180deg, rgba(28,28,40,0.7), rgba(18,18,28,0.7))",
            border: "1px solid rgba(240,201,106,0.1)",
            height: 140 + (i % 3) * 30,
          }}
        >
          <div className="h-3 w-20 bg-gold/10 rounded mb-3" />
          <div className="h-4 w-3/4 bg-gold/15 rounded mb-2" />
          <div className="h-3 w-full bg-white/5 rounded mb-1" />
          <div className="h-3 w-2/3 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onBegin, hasSearch }: { onBegin: () => void; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl text-gold-light">Nothing matches that.</p>
        <p className="mt-2 text-sm text-muted-foreground italic">
          Try a different word, or clear your filters.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-24">
      <div className="mx-auto h-32 w-32 relative mb-8">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #FFE8A8 0%, #F0C96A 35%, #C9A84C 65%, transparent 100%)",
            boxShadow: "0 0 80px 20px rgba(240,201,106,0.3)",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <BookOpen
          className="absolute inset-0 m-auto h-10 w-10 text-background"
          strokeWidth={1.4}
        />
      </div>
      <p className="font-display text-2xl md:text-3xl text-gold-light">
        Your vault is empty.
      </p>
      <p className="mt-3 text-base text-muted-foreground italic max-w-xs mx-auto">
        Your first story is one session away.
      </p>
      <div className="mt-8 mx-auto max-w-xs">
        <GoldButton type="button" onClick={onBegin}>
          Begin Today's Session
        </GoldButton>
      </div>
    </div>
  );
}
