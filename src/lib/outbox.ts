import { flushOutbox, type OutboxItem, type OutboxStore } from "@/lib/outbox-model";

/**
 * IndexedDB-backed outbox. Items hold only ciphertext (text and blobs are
 * encrypted before they are queued), so nothing readable rests on the device.
 */

const DB = "alive-outbox";
const STORE = "items";
export const OUTBOX_CHANGED_EVENT = "alive:outbox-changed";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

const store: OutboxStore = {
  all: () => tx<OutboxItem[]>("readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>),
  remove: async (id) => {
    await tx("readwrite", (s) => s.delete(id));
  },
};

function changed() {
  window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
}

export async function enqueue(item: OutboxItem) {
  await tx("readwrite", (s) => s.put(item));
  changed();
}

export async function outboxCount() {
  try {
    return (await store.all()).length;
  } catch {
    return 0;
  }
}

let senders: Partial<Record<OutboxItem["type"], (payload: never) => Promise<void>>> = {};
let flushing: Promise<{ sent: number; remaining: number }> | null = null;

/** Registers how each item type is uploaded (set once by the moments module). */
export function registerSenders(s: typeof senders) {
  senders = s;
}

/** Uploads everything queued, oldest first. Safe to call often. */
export function flush() {
  if (!flushing) {
    flushing = flushOutbox(store, async (item) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
      const send = senders[item.type];
      if (!send) throw new Error(`No sender for ${item.type}`);
      await send(item.payload as never);
    }).finally(() => {
      flushing = null;
      changed();
    });
  }
  return flushing;
}
