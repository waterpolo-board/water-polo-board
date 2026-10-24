// מהלכי דוגמה שנכנסים לספרייה בפתיחה הראשונה, כדי שהמאמן יראה מיד איך זה עובד.
import { formation } from "./formations";
import { clone, type Drawing, type ModeId, type Play, type Pos, type Step } from "./model";
import { createEntry, type SavedPlay, type Tag } from "./library";

type XY = [number, number];

interface StepSpec {
  move?: Record<string, XY>;
  ball?: XY;
  draw?: Array<[Drawing["kind"], XY, XY]>;
}

function build(mode: ModeId, specs: StepSpec[]): Play {
  const steps: Step[] = [];
  let prev = formation(mode);
  for (const spec of specs) {
    const s = clone(prev);
    s.drawings = (spec.draw ?? []).map(([kind, [x1, y1], [x2, y2]]) => ({ kind, x1, y1, x2, y2 }));
    for (const [id, [x, y]] of Object.entries(spec.move ?? {})) s.pos[id] = { ...(s.pos[id] as Pos), x, y };
    if (spec.ball) s.ball = { x: spec.ball[0], y: spec.ball[1] };
    steps.push(s);
    prev = s;
  }
  return { mode, steps };
}

// השער הכחול ב-x = 25, בין y = 8.5 ל-11.5
const EXAMPLES: Array<{ name: string; tags: Tag[]; play: Play }> = [
  {
    name: "דוגמה · 6 על 5 — העברת צד וזריקה מהכנף",
    tags: ["יתרון מספרי", "התקפה"],
    play: build("6v5", [
      { draw: [["pass", [18.4, 7.6], [19, 12.3]]] },
      { ball: [18.5, 12.9], move: { b3: [20.8, 11.2] }, draw: [["pass", [18.5, 12.9], [19.3, 17.1]]] },
      { ball: [18.9, 17.6], move: { b4: [21, 16.4], b3: [20.6, 10.2] }, draw: [["pass", [19.3, 17.1], [24.9, 11.2]]] },
      { ball: [25.3, 11] },
    ]),
  },
  {
    name: "דוגמה · 6 על 5 — מסירה לעמדה",
    tags: ["יתרון מספרי", "התקפה"],
    play: build("6v5", [
      { draw: [["move", [23, 12.5], [22.8, 12.1]], ["pass", [18.4, 7.8], [21.9, 12.3]]] },
      { move: { w7: [22.7, 12] }, ball: [21.9, 12.6], draw: [["pass", [22.2, 12.3], [24.9, 11.1]]] },
      { ball: [25.3, 11.1] },
    ]),
  },
  {
    name: "דוגמה · 6 על 6 — חדירה מהשטוח",
    tags: ["התקפה"],
    play: build("6v6", [
      { draw: [["move", [19, 5], [21.4, 6.8]]] },
      { move: { w3: [21.6, 7], b3: [20.6, 6] }, draw: [["pass", [16.6, 9.8], [21, 7.6]]] },
      { ball: [21, 7.8], draw: [["pass", [21.3, 7.6], [24.9, 8.9]]] },
      { ball: [25.3, 8.9] },
    ]),
  },
];

export function examplePlays(now = Date.now()): SavedPlay[] {
  // זמנים מדורגים כדי שהסדר בספרייה יישאר קבוע
  return EXAMPLES.map((e, i) => createEntry(e.name, e.tags, e.play, now - i * 1000));
}
