import { describe, expect, it } from "vitest";
import { formation } from "./formations";
import { History } from "./history";
import { ROSTER, type Play } from "./model";
import { parseSaved } from "./storage";

describe("formations", () => {
  it("place all 14 players and no caps overlap", () => {
    for (const mode of ["full", "6v6", "6v5"] as const) {
      const f = formation(mode);
      const ids = ROSTER.map((r) => r.id);
      expect(Object.keys(f.pos).sort()).toEqual([...ids].sort());
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const a = f.pos[ids[i]], b = f.pos[ids[j]];
          expect(Math.hypot(a.x - b.x, a.y - b.y), `${mode} ${ids[i]}/${ids[j]}`).toBeGreaterThan(1.3);
        }
    }
  });

  it("6 on 5 has exactly one excluded defender", () => {
    const f = formation("6v5");
    expect(Object.values(f.pos).filter((p) => p.excluded)).toHaveLength(1);
  });
});

describe("History", () => {
  it("undoes and redoes snapshots", () => {
    const h = new History<number>();
    h.push(1);
    h.push(2);
    expect(h.undo(3)).toBe(2);
    expect(h.undo(2)).toBe(1);
    expect(h.canUndo).toBe(false);
    expect(h.redo(1)).toBe(2);
    h.push(9);
    expect(h.canRedo).toBe(false);
  });

  it("stores copies, not references", () => {
    const h = new History<{ v: number }>();
    const s = { v: 1 };
    h.push(s);
    s.v = 5;
    expect(h.undo({ v: 0 })).toEqual({ v: 1 });
  });
});

describe("parseSaved", () => {
  const play: Play = { mode: "6v5", steps: [formation("6v5"), formation("6v6")] };

  it("round-trips a saved play through JSON", () => {
    const back = parseSaved(JSON.parse(JSON.stringify({ play, cur: 1 })));
    expect(back).toEqual({ play, cur: 1 });
  });

  it("rejects broken data instead of crashing", () => {
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved({ play: { mode: "7v7", steps: [] } })).toBeNull();
    const broken = JSON.parse(JSON.stringify(play));
    delete broken.steps[0].pos.w3;
    expect(parseSaved({ play: broken, cur: 0 })).toBeNull();
  });

  it("clamps a bad step index", () => {
    expect(parseSaved({ play, cur: 7 })?.cur).toBe(0);
  });
});
