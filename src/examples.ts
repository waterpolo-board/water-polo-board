// מהלכי דוגמה שנכנסים לספרייה בפתיחה הראשונה, כדי שהמאמן יראה מיד איך זה עובד.
import { formation } from "./formations";
import { clone, type Drawing, type ModeId, type Play, type Pos, type Step } from "./model";
import { t, type Key } from "./i18n";
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
const EXAMPLES: Array<{ name: Key; tags: Tag[]; play: Play }> = [
  {
    name: "example.1",
    tags: ["manUp", "attack"],
    play: build("6v5", [
      { draw: [["pass", [18.4, 7.6], [19, 12.3]]] },
      { ball: [18.5, 12.9], move: { b3: [20.6, 10.6] }, draw: [["pass", [18.6, 13.2], [22.2, 17.3]]] },
      { ball: [22, 18.1], move: { b4: [21.7, 16.2], b3: [21.2, 11.4] }, draw: [["pass", [22.4, 17.6], [24.9, 11.2]]] },
      { ball: [25.3, 11] },
    ]),
  },
  {
    name: "example.2",
    tags: ["manUp", "attack"],
    play: build("6v5", [
      { draw: [["move", [22.65, 12.45], [22.45, 11.95]], ["pass", [18.7, 7.8], [22.2, 10.8]]] },
      { move: { w7: [22.4, 11.9] }, ball: [22.6, 10.9], draw: [["pass", [22.8, 11], [24.9, 11.1]]] },
      { ball: [25.3, 11.1] },
    ]),
  },
  {
    name: "example.3",
    tags: ["attack"],
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
  return EXAMPLES.map((e, i) => createEntry(t(e.name), e.tags, e.play, now - i * 1000));
}
