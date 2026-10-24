// ציר הזמן של ניגון מהלך — אותו תזמון כמו בלוח, אבל דטרמיניסטי: מה רואים בכל רגע t.
// משמש ליצירת סרטון (פריים אחרי פריים, מהר יותר מזמן אמת). טהור, בלי DOM.
import { clamp, distance, type Point } from "./geometry";
import { ease } from "./motion";
import { ROSTER, type Drawing, type Play } from "./model";
import { frameBetween, frameOf, transitionDuration, type Frame } from "./playback";

const INTRO_LEAD = 300;       // שקט קצר לפני שהחצים הראשונים נכתבים
const HOLD_WITH_ARROWS = 1100;
const HOLD_PLAIN = 500;
const ARROW_FADE = 380;
const WAKE_FADE = 700;
const OUTRO = 900;
const WAKE_MIN = 0.8;

export interface SceneDrawing { d: Drawing; reveal: number; opacity: number }
export interface SceneWake { cls: string; from: Point; to: Point; opacity: number }
export interface Scene {
  frame: Frame;
  drawings: SceneDrawing[];
  wakes: SceneWake[];
  step: number; // השלב שמוצג (מספור מ-0)
}

/** כמה זמן לוקח לחץ "להיכתב" — זהה ללוח. */
export const revealTime = (d: Drawing) => 260 + distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) * 45;
const revealDelay = (i: number) => i * 90;

/** כמה זמן עד שכל החצים של שלב נכתבו. */
const revealSpan = (list: Drawing[]) => list.reduce((m, d, i) => Math.max(m, revealDelay(i) + revealTime(d)), 0);

function revealed(list: Drawing[], sinceStart: number): SceneDrawing[] {
  return list.map((d, i) => ({
    d,
    reveal: ease.outQuart(clamp((sinceStart - revealDelay(i)) / revealTime(d), 0, 1)),
    opacity: 1,
  }));
}

function wakesBetween(play: Play, i: number, f: Frame, opacity: number): SceneWake[] {
  const a = play.steps[i];
  const b = play.steps[i + 1];
  const out: SceneWake[] = [];
  for (const r of ROSTER) {
    if (distance(a.pos[r.id], b.pos[r.id]) >= WAKE_MIN) out.push({ cls: `team-${r.team}`, from: a.pos[r.id], to: f.pos[r.id], opacity });
  }
  if (distance(a.ball, b.ball) >= WAKE_MIN) out.push({ cls: "ball", from: a.ball, to: f.ball, opacity });
  return out;
}

interface Segment { kind: "hold" | "move"; step: number; start: number; dur: number }

export interface Timeline { duration: number; sceneAt(t: number): Scene }

export function buildTimeline(play: Play): Timeline {
  const segs: Segment[] = [];
  let t = 0;
  const holdFor = (step: number) =>
    play.steps[step].drawings.length ? Math.max(HOLD_WITH_ARROWS, revealSpan(play.steps[step].drawings) + 500) : HOLD_PLAIN;

  segs.push({ kind: "hold", step: 0, start: t, dur: INTRO_LEAD + holdFor(0) });
  t += INTRO_LEAD + holdFor(0);
  for (let i = 0; i < play.steps.length - 1; i++) {
    const dur = transitionDuration(play.steps[i], play.steps[i + 1]);
    segs.push({ kind: "move", step: i, start: t, dur });
    t += dur;
    const hold = holdFor(i + 1) + (i + 1 === play.steps.length - 1 ? OUTRO : 0);
    segs.push({ kind: "hold", step: i + 1, start: t, dur: hold });
    t += hold;
  }
  const duration = t;

  function sceneAt(time: number): Scene {
    const tt = clamp(time, 0, duration);
    const seg = segs.find((s) => tt < s.start + s.dur) ?? segs[segs.length - 1];
    const local = tt - seg.start;
    const s = play.steps[seg.step];

    if (seg.kind === "move") {
      const frame = frameBetween(s, play.steps[seg.step + 1], local / seg.dur);
      const fade = 1 - clamp(local / ARROW_FADE, 0, 1);
      return {
        frame,
        drawings: fade > 0 ? s.drawings.map((d) => ({ d, reveal: 1, opacity: fade })) : [],
        wakes: wakesBetween(play, seg.step, frame, 1),
        step: seg.step,
      };
    }

    // החזקה: החצים של השלב נכתבים, והשובל מהמעבר הקודם נרגע
    const frame = frameOf(s);
    const lead = seg.step === 0 ? INTRO_LEAD : 0;
    const wakeFade = 1 - clamp(local / WAKE_FADE, 0, 1);
    return {
      frame,
      drawings: local >= lead ? revealed(s.drawings, local - lead) : [],
      wakes: seg.step > 0 && wakeFade > 0 ? wakesBetween(play, seg.step - 1, frame, wakeFade) : [],
      step: seg.step,
    };
  }

  return { duration, sceneAt };
}
