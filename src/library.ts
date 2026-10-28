// ספריית מהלכים: טיפוסים ולוגיקה טהורה (חיפוש, ייצוא, ייבוא). האחסון עצמו ב-db.ts.
import { t } from "./i18n";
import { clone, type Play } from "./model";
import { cleanLabels, isValidPlay } from "./storage";

// תגיות נשמרות כמזהה קבוע; השם המוצג מגיע מהמילון לפי השפה
export const TAGS = ["attack", "defense", "manUp", "manDown", "start", "drill"] as const;
export type Tag = (typeof TAGS)[number];

/** תגיות ממהלכים שנשמרו לפני שהיו שפות (בעברית). */
const LEGACY_TAGS: Record<string, Tag> = {
  "התקפה": "attack", "הגנה": "defense", "יתרון מספרי": "manUp", "חסרון מספרי": "manDown", "פתיחה": "start", "תרגיל": "drill",
};

export function normalizeTags(raw: unknown): Tag[] {
  if (!Array.isArray(raw)) return [];
  const out = raw
    .map((x) => (TAGS.includes(x as Tag) ? (x as Tag) : LEGACY_TAGS[x as string]))
    .filter((x): x is Tag => !!x);
  return [...new Set(out)];
}

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
  return { id: newId(), name: cleanName(name) || t("untitled"), tags: [...new Set(tags)], play: clone(play), createdAt: now, updatedAt: now };
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
  const word = t("copy");
  const base = `${name} (${word})`;
  if (!taken.includes(base)) return base;
  for (let i = 2; ; i++) if (!taken.includes(`${name} (${word} ${i})`)) return `${name} (${word} ${i})`;
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
      name: cleanName(raw.name) || t("untitled"),
      tags: normalizeTags(raw.tags),
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
