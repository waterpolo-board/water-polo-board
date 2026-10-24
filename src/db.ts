// אחסון הספרייה ב-IndexedDB: נשמר על הטאבלט, שורד סגירה ועובד בלי אינטרנט.
import type { SavedPlay } from "./library";

const DB_NAME = "water-polo-board";
const STORE = "plays";

let dbPromise: Promise<IDBDatabase> | null = null;
const memory = new Map<string, SavedPlay>(); // גיבוי אם IndexedDB חסום (למשל גלישה פרטית)
let useMemory = typeof indexedDB === "undefined";

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

async function guarded<T>(idb: () => Promise<T>, mem: () => T): Promise<T> {
  if (useMemory) return mem();
  try {
    return await idb();
  } catch (err) {
    console.warn("IndexedDB לא זמין, הספרייה תישמר רק עד סגירת הדף", err);
    useMemory = true;
    return mem();
  }
}

export const allPlays = () => guarded(() => request<SavedPlay[]>("readonly", (s) => s.getAll()), () => [...memory.values()]);

export const putPlay = (p: SavedPlay) =>
  guarded(() => request("readwrite", (s) => s.put(p)).then(() => undefined), () => void memory.set(p.id, p));

export const deletePlay = (id: string) =>
  guarded(() => request("readwrite", (s) => s.delete(id)).then(() => undefined), () => void memory.delete(id));

/** מבקש מהדפדפן לא למחוק את הנתונים כשחסר מקום. */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}
