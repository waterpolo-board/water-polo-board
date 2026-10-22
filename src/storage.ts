// שמירה אוטומטית של המהלך הפתוח. (הספרייה המלאה תעבור ל-IndexedDB.)
import { ROSTER, isModeId, type Play } from "./model";

const KEY = "wpb.current.v1";

export interface Saved { play: Play; cur: number }

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

/** בדיקה שהנתונים השמורים שלמים, כדי ששמירה ישנה או פגומה לא תשבור את האפליקציה. */
export function parseSaved(v: unknown): Saved | null {
  if (!v || typeof v !== "object") return null;
  const { play, cur } = v as Partial<Saved>;
  if (!play || !isModeId(play.mode) || !Array.isArray(play.steps) || play.steps.length === 0) return null;
  const ok = play.steps.every(
    (s) => s && s.ball && Array.isArray(s.drawings) && ROSTER.every(({ id }) => Number.isFinite(s.pos?.[id]?.x) && Number.isFinite(s.pos?.[id]?.y)),
  );
  if (!ok) return null;
  return { play, cur: Number.isInteger(cur) && cur! >= 0 && cur! < play.steps.length ? cur! : 0 };
}
