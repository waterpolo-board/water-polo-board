// שמירה אוטומטית של המהלך הפתוח (localStorage). הספרייה עצמה ב-IndexedDB (db.ts).
import { ROSTER, isModeId, type Play } from "./model";

const KEY = "wpb.current.v1";

export interface Saved {
  play: Play;
  cur: number;
  /** אם המהלך נפתח מהספרייה — המזהה שלו שם, כדי לאפשר "עדכן". */
  libraryId?: string;
}

export function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // אחסון חסום (מצב פרטי וכו') — ממשיכים בלי שמירה
  }
}

export function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseSaved(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** בדיקה שמהלך שלם, כדי ששמירה ישנה, פגומה או מיובאת לא תשבור את האפליקציה. */
export function isValidPlay(play: unknown): play is Play {
  const p = play as Partial<Play> | null;
  if (!p || typeof p !== "object" || !isModeId(p.mode) || !Array.isArray(p.steps) || p.steps.length === 0) return false;
  return p.steps.every(
    (s) =>
      s && Number.isFinite(s.ball?.x) && Number.isFinite(s.ball?.y) && Array.isArray(s.drawings) &&
      ROSTER.every(({ id }) => Number.isFinite(s.pos?.[id]?.x) && Number.isFinite(s.pos?.[id]?.y)),
  );
}

export function parseSaved(v: unknown): Saved | null {
  if (!v || typeof v !== "object") return null;
  const { play, cur, libraryId } = v as Partial<Saved>;
  if (!isValidPlay(play)) return null;
  const out: Saved = { play, cur: Number.isInteger(cur) && cur! >= 0 && cur! < play.steps.length ? cur! : 0 };
  if (typeof libraryId === "string") out.libraryId = libraryId;
  return out;
}
