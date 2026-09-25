import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileUp, BookOpen } from "lucide-react";
import { existingMomentIds, saveCapture } from "@/lib/moments";
import { readFileText } from "@/lib/file-text";
import { detectDate, parseDayOne, splitDatedEntries, stableUuid } from "@/lib/import-model";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Import — ALIVE" }] }),
  component: ImportPage,
});

const FFLATE = "https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js";

type Pending = { key: string; date: string; text: string; source: string };

const todayIso = () => new Date().toISOString().slice(0, 10);
/** Midday on the entry's date, so it lands on that day in any time zone nearby. */
const atNoon = (day: string) => `${day}T12:00:00.000Z`;
const OLD_DAYS = 90;
const isOld = (day: string) => Date.now() - new Date(atNoon(day)).getTime() > OLD_DAYS * 864e5;

/**
 * Import old notes. Everything is read and encrypted on this device before
 * upload, and entries keep their original dates. Entries older than 90
 * days are stored without AI filing, so a big import doesn't spend AI
 * credit; they are still searchable and quoted by Ask.
 */
function ImportPage() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function addPaste() {
    const entries = splitDatedEntries(paste).map((e, i) => ({
      key: `paste-${Date.now()}-${i}`,
      date: e.date ?? todayIso(),
      text: e.text,
      source: "Pasted text",
    }));
    setPending((p) => [...p, ...entries]);
    setPaste("");
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setBusy("Reading files…");
    const read: Pending[] = [];
    for (const f of Array.from(list)) {
      const text = await readFileText(f);
      if (!text) {
        toast.message(`${f.name}: no readable text (PDF, Word, .txt or .md work best).`);
        continue;
      }
      read.push({
        key: `${f.name}-${f.lastModified}`,
        date: detectDate(f.name, text, f.lastModified),
        text,
        source: f.name,
      });
    }
    setPending((p) => [...p, ...read]);
    setBusy(null);
  }

  async function importPending() {
    setBusy(`Importing ${pending.length}…`);
    let done = 0;
    try {
      for (const e of pending) {
        await saveCapture({
          id: crypto.randomUUID(),
          capturedAt: atNoon(e.date),
          text: e.text,
          photos: [],
          files: [],
          skipFiling: isOld(e.date),
        });
        done++;
        setBusy(`Importing ${done} of ${pending.length}…`);
      }
      toast.success(`Imported ${done} ${done === 1 ? "entry" : "entries"}.`);
      setPending([]);
    } catch {
      toast.error(`Stopped after ${done}. The rest are still listed; try again.`);
      setPending((p) => p.slice(done));
    } finally {
      setBusy(null);
    }
  }

  async function importDayOne(file: File | undefined) {
    if (!file) return;
    setBusy("Opening the Day One export…");
    try {
      const { unzipSync, strFromU8 } = await import(/* @vite-ignore */ FFLATE);
      const zip: Record<string, Uint8Array> = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const journals = Object.keys(zip).filter((n) => n.toLowerCase().endsWith(".json"));
      const entries = journals.flatMap((n) => {
        try {
          return parseDayOne(JSON.parse(strFromU8(zip[n])));
        } catch {
          return [];
        }
      });
      if (!entries.length) throw new Error("No Day One entries found in this file.");

      const ids = await Promise.all(entries.map((e) => stableUuid(`dayone:${e.uuid}`)));
      const already = await existingMomentIds(ids);
      let done = 0;
      let skipped = 0;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (already.has(ids[i])) {
          skipped++;
          continue;
        }
        const photos = e.photos
          .map((p) => {
            const key = Object.keys(zip).find((k) => k.endsWith(p.file));
            return key
              ? new File([zip[key] as BlobPart], p.file.split("/").pop()!, { type: p.type })
              : null;
          })
          .filter(Boolean)
          .slice(0, 3) as File[];
        await saveCapture({
          id: ids[i],
          capturedAt: e.capturedAt,
          text: e.text,
          photos,
          files: [],
          fileIds: await Promise.all(photos.map((p) => stableUuid(`dayone:${e.uuid}:${p.name}`))),
          skipFiling: isOld(e.capturedAt.slice(0, 10)),
        });
        done++;
        setBusy(`Imported ${done} of ${entries.length - skipped}…`);
      }
      toast.success(
        `Imported ${done} Day One ${done === 1 ? "entry" : "entries"}${skipped ? ` (${skipped} already here)` : ""}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(null);
    }
  }

  const card = { background: "#16161F", border: "1px solid rgba(240,201,106,0.2)" };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-12 pb-28">
      <h1 className="font-display text-3xl text-gold-light tracking-tight">Import old notes</h1>
      <p
        className="mt-2 text-sm text-muted-foreground italic"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Encrypted on this device before upload. Entries keep their original dates.
      </p>

      <section className="mt-8 rounded-[14px] p-5" style={card}>
        <h2 className="flex items-center gap-2 font-display text-xl text-gold-light">
          <FileUp className="h-4 w-4" /> Files or pasted text
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF, Word (.docx), .txt or .md. Dates come from the file name, the first line, or when the
          file was last changed. Pasted text splits into entries at lines that are just a date.
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,text/*,application/pdf"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
          className="mt-4 block text-sm text-foreground/80"
        />
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={5}
          placeholder={"2025-11-02\nSigned the lease…\n\n3 November 2025\nMoved boxes…"}
          className="mt-4 w-full resize-y rounded-[14px] bg-[#0A0A0F] p-4 text-sm outline-none"
          style={{ border: "1px solid rgba(240,201,106,0.18)", fontFamily: "Georgia, serif" }}
        />
        <button
          type="button"
          onClick={addPaste}
          disabled={!paste.trim()}
          className="mt-2 text-xs uppercase tracking-[0.3em] text-gold/80 hover:text-gold-light disabled:opacity-40"
        >
          Add pasted text
        </button>

        {pending.length > 0 && (
          <>
            <ul className="mt-5 space-y-2">
              {pending.map((e) => (
                <li key={e.key} className="flex items-start gap-3 rounded-[14px] bg-[#0A0A0F] p-3">
                  <input
                    type="date"
                    value={e.date}
                    onChange={(ev) =>
                      setPending((p) =>
                        p.map((x) => (x.key === e.key ? { ...x, date: ev.target.value } : x)),
                      )
                    }
                    className="h-9 rounded-lg bg-transparent px-2 text-xs text-gold-light"
                    style={{ border: "1px solid rgba(240,201,106,0.2)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground truncate">{e.source}</p>
                    <p className="text-sm text-foreground/85 line-clamp-2">{e.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPending((p) => p.filter((x) => x.key !== e.key))}
                    className="text-xs text-muted-foreground hover:text-gold-light"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void importPending()}
              className="mt-4 h-12 w-full rounded-[14px] text-sm uppercase tracking-[0.2em] text-background disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F0C96A, #C9A84C)" }}
            >
              Import {pending.length} {pending.length === 1 ? "entry" : "entries"}
            </button>
          </>
        )}
      </section>

      <section className="mt-6 rounded-[14px] p-5" style={card}>
        <h2 className="flex items-center gap-2 font-display text-xl text-gold-light">
          <BookOpen className="h-4 w-4" /> Day One
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          In Day One, export as JSON (a .zip file), then choose it here. Text, dates and up to three
          photos per entry come across. Importing the same file again won't create copies.
        </p>
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={Boolean(busy)}
          onChange={(e) => {
            void importDayOne(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="mt-4 block text-sm text-foreground/80"
        />
      </section>

      {busy && (
        <p role="status" className="mt-6 text-sm text-gold-light">
          {busy}
        </p>
      )}
      <p className="mt-8 text-sm text-muted-foreground">
        Imported entries appear in the{" "}
        <Link to="/vault" className="text-gold underline-offset-4 hover:underline">
          Vault
        </Link>{" "}
        on their original dates.
      </p>
    </div>
  );
}
