import { POOL } from "./geometry";
import type { ModeId, Pos, Step } from "./model";

const L = POOL.length;

type Spot = [x: number, y: number, excluded?: boolean];
interface Layout { w: Spot[]; b: Spot[]; ball: [number, number] }

// שבעה מקומות לכל קבוצה, לפי הסדר: שוער (1) ואז שחקני שדה 2–7.
// הלבנים תוקפים את השער הכחול (x = L).
const LAYOUTS: Record<ModeId, Layout> = {
  // פתיחה: כל קבוצה בחצי שלה
  full: {
    w: [[0.6, 10], [6, 4], [7, 8], [7, 12], [6, 16], [10.5, 6], [10.5, 14]],
    b: [[L - 0.6, 10], [L - 6, 4], [L - 7, 8], [L - 7, 12], [L - 6, 16], [L - 10.5, 6], [L - 10.5, 14]],
    ball: [L / 2, 10],
  },
  // 6 על 6: התקפת 3-3 מול הגנה אישית
  "6v6": {
    w: [[0.6, 10], [L - 2, 3.5], [L - 6, 5], [L - 7.5, 10], [L - 6, 15], [L - 2, 16.5], [L - 2.5, 10]],
    b: [[L - 0.3, 10], [L - 1.2, 5], [L - 4.6, 5.8], [L - 6.1, 10], [L - 4.6, 14.2], [L - 1.2, 15], [L - 1.4, 10.9]],
    ball: [L - 8.6, 10],
  },
  // 6 על 5: התקפת 4-2 מול הגנת אזור; כחול 7 מורחק באזור הכניסה מחדש
  "6v5": {
    w: [[0.6, 10], [L - 5, 2.5], [L - 5.5, 7.5], [L - 5.5, 12.5], [L - 5, 17.5], [L - 2, 7.5], [L - 2, 12.5]],
    b: [[L - 0.3, 10], [L - 3.8, 4], [L - 4.4, 10], [L - 3.8, 16], [L - 1.3, 8.6], [L - 1.3, 11.4], [L - 0.4, 19.2, true]],
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
