// ספריית מהלכים: טיפוסים ולוגיקה טהורה (חיפוש, ייצוא, ייבוא). האחסון עצמו ב-db.ts.
import { clone, type Play } from "./model";
import { cleanLabels, isValidPlay } from "./storage";

export const TAGS = ["התקפה", "הגנה", "יתרון מספרי", "חסרון מספרי", "פתיחה", "תרגיל"] as const;
export type Tag = (typeof TAGS)[number];
const isTag = (t: unknown): t is Tag => TAGS.includes(t as Tag);

export interface SavedPlay {
  id: string;
  name: string;
  tags: Tag[];
  play: Play;
  createdAt: number;
  updatedAt: number;
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 60);

export function createEntry(name: string, tags: Tag[], play: Play, now = Date.now()): SavedPlay {
  return { id: newId(), name: cleanName(name) || "מהלך ללא שם", tags: [...new Set(tags)], play: clone(play), createdAt: now, updatedAt: now };
}

/** החדשים למעלה. החיפוש לפי שם, בלי תלות ברווחים מיותרים. */
export function filterPlays(list: SavedPlay[], query = "", tag: Tag | null = null): SavedPlay[] {
  const q = cleanName(query).toLowerCase();
  return list
    .filter((p) => (!tag || p.tags.includes(tag)) && (!q || p.name.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** שם פנוי לעותק: "X (עותק)", "X (עותק 2)"... */
export function copyName(name: string, taken: string[]): string {
  const base = `${name} (עותק)`;
  if (!taken.includes(base)) return base;
  for (let i = 2; ; i++) if (!taken.includes(`${name} (עותק ${i})`)) return `${name} (עותק ${i})`;
}

// ---------- גיבוי ----------
const FORMAT = "water-polo-board";

export function exportLibrary(list: SavedPlay[]): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), plays: list }, null, 1);
}

/** קורא קובץ גיבוי. מהלך פגום מדלגים עליו; קובץ שאינו גיבוי — null. */
export function parseImport(text: string): SavedPlay[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const d = data as { format?: unknown; plays?: unknown };
  if (!d || d.format !== FORMAT || !Array.isArray(d.plays)) return null;
  const out: SavedPlay[] = [];
  for (const raw of d.plays as Partial<SavedPlay>[]) {
    if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string" || !isValidPlay(raw.play)) continue;
    cleanLabels(raw.play);
    const now = Date.now();
    out.push({
      id: raw.id,
      name: cleanName(raw.name) || "מהלך ללא שם",
      tags: Array.isArray(raw.tags) ? raw.tags.filter(isTag) : [],
      play: raw.play,
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt! : now,
      updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt! : now,
    });
  }
  return out;
}

/** מיזוג: מהלך שקיים בשני הצדדים — נשאר החדש יותר. מחזיר רק את מה שצריך לכתוב. */
export function mergeImport(existing: SavedPlay[], incoming: SavedPlay[]): SavedPlay[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  return incoming.filter((p) => {
    const old = byId.get(p.id);
    return !old || p.updatedAt > old.updatedAt;
  });
}
