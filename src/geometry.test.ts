import { describe, expect, it } from "vitest";
import { POOL, cameraFor, lerpCamera, toScreen } from "./geometry";

const size = { w: 1280, h: 680 };

describe("camera", () => {
  it("full view fits the whole pool inside the screen", () => {
    const c = cameraFor("full", size);
    for (const p of [{ x: 0, y: 0 }, { x: POOL.length, y: POOL.width }]) {
      const s = toScreen(c, size, p);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(size.w);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(size.h);
    }
  });

  it("goal view puts the attacked goal at the top and the pool width across the screen", () => {
    const c = cameraFor("goal", size);
    const goal = toScreen(c, size, { x: POOL.length, y: POOL.width / 2 });
    const half = toScreen(c, size, { x: POOL.length / 2, y: POOL.width / 2 });
    expect(goal.y).toBeLessThan(half.y);
    expect(goal.y).toBeGreaterThan(0);
    expect(half.y).toBeLessThanOrEqual(size.h);
    const left = toScreen(c, size, { x: POOL.length - 3, y: 0 });
    const right = toScreen(c, size, { x: POOL.length - 3, y: POOL.width });
    expect(Math.abs(left.y - right.y)).toBeLessThan(1e-6); // רוחב הבריכה אופקי
    expect(left.x).toBeGreaterThanOrEqual(0);
    expect(right.x).toBeLessThanOrEqual(size.w);
  });

  it("interpolates halfway between views", () => {
    const a = cameraFor("full", size);
    const b = cameraFor("goal", size);
    const m = lerpCamera(a, b, 0.5);
    expect(m.angle).toBe(-45);
    expect(m.cx).toBeCloseTo((a.cx + b.cx) / 2);
  });

  it("in portrait, rotates the full pool and keeps the goal pinned to the top", () => {
    const tall = { w: 800, h: 1180 };
    const full = cameraFor("full", tall);
    expect(full.angle).toBe(-90);
    for (const p of [{ x: 0, y: 0 }, { x: POOL.length, y: POOL.width }]) {
      const s = toScreen(full, tall, p);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(tall.h);
    }
    const goal = cameraFor("goal", tall);
    const goalLine = toScreen(goal, tall, { x: POOL.length, y: POOL.width / 2 });
    expect(goalLine.y).toBeLessThan(tall.h * 0.1);
  });
});
