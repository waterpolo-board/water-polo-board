import { POOL } from "./geometry";
import type { ModeId, Pos, Step } from "./model";

const L = POOL.length;

type Spot = [x: number, y: number, excluded?: boolean];
interface Layout { w: Spot[]; b: Spot[]; ball: [number, number] }

// שבעה מקומות לכל קבוצה, לפי הסדר: שוער (1) ואז שחקני שדה 2–7.
// הלבנים תוקפים את השער הכחול (x = L).
const LAYOUTS: Record<ModeId, Layout> = {
  // בריכה מלאה: הלבנים עם הכדור במרכז, כל כחול שומר על "השחקן שלו"
  full: {
    w: [[0.6, 10], [11.75, 1.5], [11.8, 9.75], [8.35, 8.85], [10.3, 15.5], [12.2, 4.15], [12.35, 13.4]],
    b: [[L - 0.6, 10], [17.3, 3.3], [20.6, 10.4], [14.3, 10.3], [19, 16], [14.5, 6], [14.5, 14]],
    ball: [12.8, 10.05],
  },
  // 6 על 6: התקפת 3-3 מול הגנה אישית
  "6v6": {
    w: [[0.6, 10], [L - 2, 3.5], [L - 6, 5], [L - 7.5, 10], [L - 6, 15], [L - 2, 16.5], [L - 2.5, 10]],
    b: [[L - 0.3, 10], [L - 1.2, 5], [L - 4.6, 5.8], [L - 6.1, 10], [L - 4.6, 14.2], [L - 1.2, 15], [L - 1.4, 10.9]],
    ball: [L - 8.6, 10],
  },
  // 6 על 5 (אחד יותר): ארבעה על קו 2 מ', שניים על קו 5 מ'; כחול 7 מורחק באזור הכניסה מחדש
  "6v5": {
    w: [[0.6, 10], [L - 1.85, 3.45], [L - 5.5, 7.5], [L - 5.5, 12.5], [L - 2, 17.65], [L - 2.25, 8.1], [L - 2.35, 12.45]],
    b: [[L - 0.3, 10], [L - 1.35, 5.8], [L - 4, 7.65], [L - 3.75, 12.7], [L - 1.25, 9], [L - 1, 12.6], [L - 0.4, 19.2, true]],
    ball: [L - 6.6, 7.5],
  },
};

export function formation(mode: ModeId): Step {
  const layout = LAYOUTS[mode];
  const pos: Record<string, Pos> = {};
  for (const team of ["w", "b"] as const) {
    layout[team].forEach(([x, y, excluded], i) => {
      pos[`${team}${i + 1}`] = excluded ? { x, y, excluded } : { x, y };
    });
  }
  return { pos, ball: { x: layout.ball[0], y: layout.ball[1] }, drawings: [] };
}
