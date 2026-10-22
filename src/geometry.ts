// גאומטריה ומצלמה. כל המצב נשמר במטרים:
// x = לאורך הבריכה (0 = שער הלבנים, L = שער הכחולים), y = לרוחב (0..W).

export const POOL = { length: 25, width: 20, goalWidth: 3 } as const;
const L = POOL.length;
const W = POOL.width;

export interface Point { x: number; y: number }
export interface Size { w: number; h: number }

/** מצלמה: איזו נקודה בבריכה במרכז המסך, בכמה מעלות מסובבת, וכמה פיקסלים למטר. */
export interface Camera { cx: number; cy: number; angle: number; scale: number }

export type ViewId = "full" | "goal";

interface Frame { cx: number; cy: number; angle: number; spanX: number; spanY: number }

// spanX / spanY = כמה מטרים צריכים להיכנס לרוחב / לגובה המסך
const FRAMES: Record<ViewId, Frame> = {
  // כל הבריכה לאורך, השערים מימין ומשמאל
  full: { cx: L / 2, cy: W / 2, angle: 0, spanX: L + 2.4, spanY: W + 1.6 },
  // אזור השער לרוחב: מסובב 90°, השער הכחול למעלה, עד מטר אחרי קו האמצע
  goal: { cx: (L / 2 - 1 + L + 1.2) / 2, cy: W / 2, angle: -90, spanX: W + 1.4, spanY: L / 2 + 2.2 },
};

// במסך עומד גם הבריכה המלאה מסתובבת, כדי לנצל את הגובה
const FULL_PORTRAIT: Frame = { cx: L / 2, cy: W / 2, angle: -90, spanX: W + 1.6, spanY: L + 2.4 };

/** הקצה העליון (בכיוון השער) של תצוגת אזור השער — נשאר צמוד למעלה גם כשיש עודף גובה. */
const GOAL_TOP = L + 1.2;

export function cameraFor(view: ViewId, size: Size): Camera {
  const portrait = size.h > size.w * 1.1;
  const f = view === "full" && portrait ? FULL_PORTRAIT : FRAMES[view];
  const scale = Math.min(size.w / f.spanX, size.h / f.spanY);
  let cx = f.cx;
  if (view === "goal") {
    // אם יש עודף גובה, מראים עוד מים מתחת במקום רווח ריק מעל השער
    const visible = size.h / scale;
    cx = Math.min(f.cx, GOAL_TOP - visible / 2);
  }
  return { cx, cy: f.cy, angle: f.angle, scale };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  return {
    cx: lerp(a.cx, b.cx, t),
    cy: lerp(a.cy, b.cy, t),
    angle: lerp(a.angle, b.angle, t),
    scale: lerp(a.scale, b.scale, t),
  };
}

export function cameraTransform(c: Camera, size: Size): string {
  return `translate(${size.w / 2} ${size.h / 2}) rotate(${c.angle}) scale(${c.scale}) translate(${-c.cx} ${-c.cy})`;
}

/** נקודה בבריכה → פיקסלים במסך (אותה מתמטיקה כמו cameraTransform, לבדיקות). */
export function toScreen(c: Camera, size: Size, p: Point): Point {
  const rad = (c.angle * Math.PI) / 180;
  const dx = (p.x - c.cx) * c.scale;
  const dy = (p.y - c.cy) * c.scale;
  return {
    x: size.w / 2 + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: size.h / 2 + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

export const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** שומר כלים בתוך הבריכה (עם חצי מטר מרווח לאזור הכניסה מחדש). */
export const clampToPool = (p: Point): Point => ({ x: clamp(p.x, -0.5, L + 0.5), y: clamp(p.y, -0.5, W + 0.5) });
