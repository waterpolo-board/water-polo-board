import { describe, expect, it } from "vitest";
import { formation } from "./formations";
import { ROSTER, clone } from "./model";
import { frameBetween, frameOf, transitionDuration } from "./playback";

describe("frameBetween", () => {
  const a = formation("6v6");
  const b = clone(a);
  b.pos.w2 = { x: a.pos.w2.x + 4, y: a.pos.w2.y };
  b.ball = { x: a.ball.x + 6, y: a.ball.y - 3 };

  it("starts at a and ends at b", () => {
    expect(frameBetween(a, b, 0).pos.w2.x).toBeCloseTo(a.pos.w2.x);
    expect(frameBetween(a, b, 1).pos.w2.x).toBeCloseTo(b.pos.w2.x);
    expect(frameBetween(a, b, 1).ball.x).toBeCloseTo(b.ball.x);
  });

  it("lifts the ball on a pass and lands it", () => {
    expect(frameBetween(a, b, 0.5).ball.lift).toBeGreaterThan(0.5);
    expect(frameBetween(a, b, 1).ball.lift).toBeCloseTo(0);
    expect(frameBetween(a, b, 0).ball.lift).toBeCloseTo(0);
  });

  it("keeps a short dribble on the water", () => {
    const c = clone(a);
    c.ball = { x: a.ball.x + 0.5, y: a.ball.y };
    expect(frameBetween(a, c, 0.5).ball.lift).toBe(0);
  });

  it("staggers pieces: later pieces start later but everyone arrives", () => {
    const far = formation("full");
    const mid = frameBetween(far, a, 0.2, { stagger: 0.03 });
    const first = ROSTER[1].id; // w2 — השוער הלבן לא זז בין המערכים האלה
    const last = ROSTER[ROSTER.length - 1].id;
    const progress = (id: string) => (mid.pos[id].x - far.pos[id].x) / (a.pos[id].x - far.pos[id].x || 1);
    expect(progress(first)).toBeGreaterThan(progress(last));
    const end = frameBetween(far, a, 1, { stagger: 0.03 });
    for (const { id } of ROSTER) expect(end.pos[id].x).toBeCloseTo(a.pos[id].x);
  });

  it("fades exclusion smoothly, also from a mid-transition frame", () => {
    const v5 = formation("6v5");
    const v6 = formation("6v6");
    expect(frameOf(v5).pos.b7.ex).toBe(1);
    const mid = frameBetween(v5, v6, 0.5);
    expect(mid.pos.b7.ex).toBeGreaterThan(0);
    expect(mid.pos.b7.ex).toBeLessThan(1);
    expect(frameBetween(mid, v6, 0).pos.b7.ex).toBeCloseTo(mid.pos.b7.ex);
  });
});

describe("transitionDuration", () => {
  it("is longer for longer moves and faster at higher speed", () => {
    const a = formation("full");
    const near = clone(a);
    near.pos.w2.x += 1;
    const far = clone(a);
    far.pos.w2.x += 9;
    expect(transitionDuration(a, far)).toBeGreaterThan(transitionDuration(a, near));
    expect(transitionDuration(a, far, 2)).toBeCloseTo(transitionDuration(a, far) / 2);
  });
});
