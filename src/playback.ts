// חישוב מצב הלוח בכל רגע של מעבר בין שני שלבים. טהור, בלי DOM.
import { clamp, distance, lerp, type Point } from "./geometry";
import { ease } from "./motion";
import { ROSTER, type Pos } from "./model";

/** מרחק (מ') שמעליו תזוזת הכדור נחשבת מסירה ועפה בקשת. */
export const PASS_MIN = 1.5;

export interface FramePiece extends Point { ex: number } // ex: 0 = במשחק, 1 = מורחק
export interface Frame { pos: Record<string, FramePiece>; ball: Point & { lift: number } }

/** שלב שמור או תמונה שמוצגת כרגע (שאולי נעצרה באמצע מעבר). */
export interface PoseLike { pos: Record<string, Pos & { ex?: number }>; ball: Point }

const exOf = (p: Pos & { ex?: number }) => p.ex ?? (p.excluded ? 1 : 0);

export function frameOf(p: PoseLike): Frame {
  return frameBetween(p, p, 1);
}

export interface BetweenOptions {
  /** השהיה בין שחקן לשחקן, כחלק מכל המעבר (0 = כולם יחד). */
  stagger?: number;
}

/** t גולמי בין 0 ל-1. ההאטה מחושבת כאן, לכל שחקן בנפרד. */
export function frameBetween(a: PoseLike, b: PoseLike, t: number, { stagger = 0 }: BetweenOptions = {}): Frame {
  const n = ROSTER.length;
  const span = Math.max(0.0001, 1 - stagger * (n - 1));
  const pos: Record<string, FramePiece> = {};

  ROSTER.forEach(({ id }, i) => {
    const from = a.pos[id];
    const to = b.pos[id];
    const local = ease.inOutCubic(clamp((t - i * stagger) / span, 0, 1));
    pos[id] = {
      x: lerp(from.x, to.x, local),
      y: lerp(from.y, to.y, local),
      ex: lerp(exOf(from), exOf(to), local),
    };
  });

  const isPass = distance(a.ball, b.ball) > PASS_MIN;
  const bt = isPass ? ease.inOutSine(clamp(t, 0, 1)) : ease.inOutCubic(clamp(t, 0, 1));
  const lift = isPass ? Math.sin(Math.PI * clamp(t, 0, 1)) * Math.min(1, distance(a.ball, b.ball) / 8) : 0;

  return { pos, ball: { x: lerp(a.ball.x, b.ball.x, bt), y: lerp(a.ball.y, b.ball.y, bt), lift } };
}

/** משך מעבר לפי המרחק הכי ארוך שמישהו עובר: תנועה קצרה מהירה, ארוכה לוקחת זמן. */
export function transitionDuration(a: PoseLike, b: PoseLike, speed = 1): number {
  let max = distance(a.ball, b.ball) * 0.6;
  for (const { id } of ROSTER) max = Math.max(max, distance(a.pos[id], b.pos[id]));
  return clamp(650 + max * 110, 700, 1800) / speed;
}
