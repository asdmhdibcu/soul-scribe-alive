import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAiAccess } from "@/lib/ai-client";
import { AskPanel } from "@/components/ask/AskPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  ImageIcon,
  Mic,
  Paperclip,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoldParticles } from "@/components/landing/atmos";
import { GoldButton } from "@/components/auth/AuthShell";
import { usePlan, FREE_LIMITS } from "@/lib/plan";
import { InlineLock } from "@/components/UpgradeGate";
import { formatBytes } from "@/lib/capture-model";
import {
  deleteMoment,
  downloadAttachment,
  filterMoments,
  loadDaysWritten,
  loadMoments,
  MOMENT_SAVED_EVENT,
  openMedia,
  type Moment,
} from "@/lib/moments";

export const Route = createFileRoute("/_authenticated/vault")({
  // ?day=YYYY-MM-DD shows one day (Ask links cited dates here).
  validateSearch: (s: Record<string, unknown>): { day?: string } =>
    typeof s.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.day) ? { day: s.day } : {},
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

type Filter = "all" | "text" | "voice" | "photo" | "favorites" | "month";
type Entry = Moment;

const PAGE_SIZE = 60;

function VaultPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPages: 0,
    daysWritten: 0,
    daysAlive: 0,
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [memOpen, setMemOpen] = useState(false);
  const { day: dayFilter } = Route.useSearch();
  const { plan } = usePlan();
  const unlimitedVault = plan === "soul" || plan === "family" || plan === "legacy";
  // Ask works on a paid plan or with the person's own AI key.
  const { hasAi } = useAiAccess();
  const canMemorySearch = hasAi;
  const vaultCapDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - FREE_LIMITS.vault_days);
    return d.toISOString().slice(0, 10);
  }, []);

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
      const [{ data: userRow }, { count }, daysWritten] = await Promise.all([
        supabase.from("users").select("created_at").eq("id", u.user.id).maybeSingle(),
        supabase
          .from("moments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.user.id),
        loadDaysWritten(30),
      ]);
      const createdAt = userRow?.created_at ? new Date(userRow.created_at) : new Date();
      const daysAlive = Math.max(
        1,
        Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      setStats({
        totalPages: count ?? 0,
        daysWritten,
        daysAlive,
      });
    })();
  }, []);

  // Load and decrypt on this device. Search and filters run on the plaintext
  // here, because the server only holds ciphertext.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setEntries(await loadMoments({ sinceDay: unlimitedVault ? undefined : vaultCapDate }));
      } catch (e) {
        console.error(e);
        toast.error("Could not load your vault.");
      } finally {
        setLoading(false);
      }
    })();
  }, [unlimitedVault, vaultCapDate]);

  // A capture saved from the floating button shows up here straight away.
  useEffect(() => {
    const reload = () =>
      loadMoments({ sinceDay: unlimitedVault ? undefined : vaultCapDate })
        .then(setEntries)
        .catch(() => {});
    window.addEventListener(MOMENT_SAVED_EVENT, reload);
    return () => window.removeEventListener(MOMENT_SAVED_EVENT, reload);
  }, [unlimitedVault, vaultCapDate]);

  useEffect(() => setShown(PAGE_SIZE), [filter, debouncedSearch]);

  const visible = useMemo(() => {
    const base = filterMoments(dayFilter ? entries.filter((e) => e.day === dayFilter) : entries, {
      search: debouncedSearch,
      kind: filter === "text" || filter === "voice" || filter === "photo" ? filter : undefined,
      since:
        filter === "month"
          ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
          : undefined,
    });
    if (filter !== "favorites") return base;
    try {
      const favs = JSON.parse(localStorage.getItem("alive:favs") ?? "[]") as string[];
      return base.filter((e) => favs.includes(e.id));
    } catch {
      return [];
    }
  }, [entries, filter, debouncedSearch, dayFilter]);

  async function deleteEntry(id: string) {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    try {
      await deleteMoment(target);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setStats((s) => ({ ...s, totalPages: Math.max(0, s.totalPages - 1) }));
      setActiveEntry(null);
      setConfirmDelete(null);
      toast.success("Moment removed.");
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
        <div className="mt-7 grid grid-cols-2 gap-3">
          <StatCard
            icon={<BookOpen className="h-4 w-4" />}
            label="Moments"
            value={stats.totalPages}
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Last 30 days"
            value={stats.daysWritten}
            suffix={`of 30 days written`}
          />
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

        {dayFilter && (
          <div className="mt-5 flex items-center gap-3 text-sm text-gold-light">
            <span>
              Showing{" "}
              {new Date(`${dayFilter}T12:00:00Z`).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              onClick={() => navigate({ to: "/vault", search: {} })}
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-light"
            >
              Show all
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          <FilterTab active={filter === "text"} onClick={() => setFilter("text")} label="Written" />
          <FilterTab active={filter === "voice"} onClick={() => setFilter("voice")} label="Voice" />
          <FilterTab
            active={filter === "photo"}
            onClick={() => setFilter("photo")}
            label="Photos"
          />
          <FilterTab
            active={filter === "favorites"}
            onClick={() => setFilter("favorites")}
            label="Favorites"
            icon="⭐"
          />
          <FilterTab
            active={filter === "month"}
            onClick={() => setFilter("month")}
            label="This Month"
          />
        </div>

        {/* Memory search */}
        <div
          className="mt-5 rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(240,201,106,0.25)",
            background: "linear-gradient(160deg, rgba(240,201,106,0.06), rgba(22,22,31,0.6))",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (!canMemorySearch) return;
              setMemOpen((v) => !v);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left"
          >
            <Sparkles className="h-4 w-4 text-gold-light" />
            <span className="text-sm tracking-wide text-gold-light italic">
              Ask your memory anything
            </span>
            <span className="ml-auto flex items-center gap-2">
              {!canMemorySearch ? (
                <InlineLock required="soul" />
              ) : (
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {memOpen ? "Close" : "Open"}
                </span>
              )}
            </span>
          </button>
          {memOpen && canMemorySearch && (
            <div className="px-4 pb-4">
              <AskPanel />
            </div>
          )}
        </div>

        {/* Entries */}
        <div className="mt-8">
          {loading ? (
            <SkeletonGrid />
          ) : visible.length === 0 ? (
            <EmptyState
              onBegin={() => navigate({ to: "/reflect" })}
              hasSearch={!!debouncedSearch || filter !== "all"}
            />
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {visible.slice(0, shown).map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onOpen={() => setActiveEntry(entry)}
                  onDelete={() => setConfirmDelete(entry.id)}
                />
              ))}
            </div>
          )}

          {!loading && visible.length > shown && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="text-xs uppercase tracking-[0.3em] text-gold-light/80 hover:text-gold-light"
              >
                Show more
              </button>
            </div>
          )}
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
        {suffix && (
          <span className="ml-1 text-xs text-muted-foreground tracking-normal">{suffix}</span>
        )}
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
        border: active ? "1px solid rgba(240,201,106,0.6)" : "1px solid rgba(240,201,106,0.18)",
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
  const date = new Date(entry.capturedAt);
  const preview = entry.decryptFailed
    ? UNDECRYPTABLE
    : (entry.text ?? "").trim().split("\n")[0].slice(0, 140);
  const moodColor = "rgba(240,201,106,0.4)";

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
            <div className="flex items-center gap-1.5 text-gold-light/70">
              {entry.hasAudio && <Mic className="h-3 w-3" aria-label="Voice" />}
              {entry.hasPhoto && <ImageIcon className="h-3 w-3" aria-label="Photo" />}
              {entry.attachments.some((a) => a.kind === "file") && (
                <Paperclip className="h-3 w-3" aria-label="File" />
              )}
            </div>
          </div>

          <h3 className="mt-2 font-display text-lg leading-snug text-gold-light tracking-tight">
            {momentLabel(entry)}
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
  const moodColor = "rgba(240,201,106,0.4)";
  const date = new Date(entry.capturedAt);
  const [isFav, setIsFav] = useState(false);
  const photoUrl = useMediaUrl(entry.photoPath, "image/jpeg");
  const audioUrl = useMediaUrl(entry.audioPath, entry.audioMime ?? "audio/webm");

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("alive:favs") ?? "[]") as string[];
      setIsFav(favs.includes(entry.id));
    } catch {
      /* empty */
    }
  }, [entry.id]);

  function toggleFav() {
    try {
      const favs = JSON.parse(localStorage.getItem("alive:favs") ?? "[]") as string[];
      const next = favs.includes(entry.id)
        ? favs.filter((id) => id !== entry.id)
        : [...favs, entry.id];
      localStorage.setItem("alive:favs", JSON.stringify(next));
      setIsFav(next.includes(entry.id));
    } catch {
      /* empty */
    }
  }

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
            })}{" "}
            · {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
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
            {momentLabel(entry)}
          </h1>

          {entry.decryptFailed && (
            <p className="mt-8 text-center text-sm text-red-300/90">{UNDECRYPTABLE}</p>
          )}

          {entry.text && (
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
              {entry.text}
            </div>
          )}

          {audioUrl && <audio controls src={audioUrl} className="mt-8 w-full" />}

          {photoUrl && (
            <img
              src={photoUrl}
              alt="Memory"
              className="mt-8 w-full rounded-2xl"
              style={{ boxShadow: "0 0 0 1px rgba(240,201,106,0.18)" }}
            />
          )}

          {entry.attachments
            .filter((a) => a.kind === "photo")
            .map((a) => (
              <AttachmentPhoto key={a.id} path={a.path} mime={a.mime} />
            ))}

          {entry.attachments.some((a) => a.kind === "file") && (
            <ul className="mt-8 space-y-2">
              {entry.attachments
                .filter((a) => a.kind === "file")
                .map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() =>
                        downloadAttachment(a).catch(() => toast.error("Could not open the file."))
                      }
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-foreground/85 hover:text-gold-light"
                      style={{ border: "1px solid rgba(240,201,106,0.2)", background: "#16161F" }}
                    >
                      <Paperclip className="h-4 w-4 text-gold-light/80 shrink-0" />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}

          <div className="mt-10 mb-12" />
        </div>
      </motion.div>
    </motion.div>
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
        <BookOpen className="absolute inset-0 m-auto h-10 w-10 text-background" strokeWidth={1.4} />
      </div>
      <p className="font-display text-2xl md:text-3xl text-gold-light">Your vault is empty.</p>
      <p className="mt-3 text-base text-muted-foreground italic max-w-xs mx-auto">
        Tap the feather to capture your first moment.
      </p>
      <div className="mt-8 mx-auto max-w-xs">
        <GoldButton type="button" onClick={onBegin}>
          Begin a reflection
        </GoldButton>
      </div>
    </div>
  );
}

const UNDECRYPTABLE = "This entry could not be decrypted.";

function momentLabel(m: Moment) {
  if (m.decryptFailed) return "Sealed moment";
  if (m.kind === "voice") return "Voice note";
  if (m.kind === "photo" && !m.text) return "Photo";
  if (m.kind === "file" && !m.text) return m.attachments[0]?.name ?? "File";
  return "Written";
}

function AttachmentPhoto({ path, mime }: { path: string; mime: string }) {
  const url = useMediaUrl(path, mime);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Memory"
      className="mt-6 w-full rounded-2xl"
      style={{ boxShadow: "0 0 0 1px rgba(240,201,106,0.18)" }}
    />
  );
}

/** Decrypts a stored photo or recording on demand; revokes the URL on close. */
function useMediaUrl(path: string | null, type: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let current: string | null = null;
    let cancelled = false;
    openMedia(path, type)
      .then((u) => {
        current = u;
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [path, type]);
  return url;
}
