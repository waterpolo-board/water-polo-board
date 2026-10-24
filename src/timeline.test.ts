import { describe, expect, it } from "vitest";
import { examplePlays } from "./examples";
import { formation } from "./formations";
import { ROSTER } from "./model";
import { buildTimeline } from "./timeline";

describe("video timeline", () => {
  const play = examplePlays()[0].play; // 4 שלבים עם חצים ומסירות
  const tl = buildTimeline(play);
  const last = play.steps[play.steps.length - 1];

  it("starts on the first step and ends on the last", () => {
    const first = tl.sceneAt(0);
    const end = tl.sceneAt(tl.duration);
    expect(first.step).toBe(0);
    expect(end.step).toBe(play.steps.length - 1);
    for (const { id } of ROSTER) {
      expect(first.frame.pos[id].x).toBeCloseTo(play.steps[0].pos[id].x);
      expect(end.frame.pos[id].x).toBeCloseTo(last.pos[id].x);
    }
    expect(end.frame.ball.x).toBeCloseTo(last.ball.x);
  });

  it("walks through the steps in order", () => {
    let prev = 0;
    for (let t = 0; t <= tl.duration; t += 50) {
      const s = tl.sceneAt(t).step;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    expect(prev).toBe(play.steps.length - 1);
  });

  it("writes the first step's arrows on before anything moves", () => {
    expect(tl.sceneAt(0).drawings).toEqual([]);
    const later = tl.sceneAt(1200).drawings;
    expect(later.length).toBe(play.steps[0].drawings.length);
    expect(later.every((d) => d.reveal === 1)).toBe(true);
    expect(tl.sceneAt(1200).frame.pos.w3.x).toBeCloseTo(play.steps[0].pos.w3.x);
  });

  it("shows wakes and a lofted ball while passing", () => {
    // מחפשים רגע באמצע מסירה
    let found = false;
    for (let t = 0; t <= tl.duration && !found; t += 40) {
      const s = tl.sceneAt(t);
      if (s.frame.ball.lift > 0.4) found = s.wakes.some((w) => w.cls === "ball");
    }
    expect(found).toBe(true);
  });

  it("handles a single-step play as a short still", () => {
    const still = buildTimeline({ mode: "full", steps: [formation("full")] });
    expect(still.duration).toBeGreaterThan(0);
    expect(still.sceneAt(still.duration).step).toBe(0);
  });
});
