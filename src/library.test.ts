import { describe, expect, it } from "vitest";
import { examplePlays } from "./examples";
import { formation } from "./formations";
import { copyName, createEntry, exportLibrary, filterPlays, mergeImport, parseImport } from "./library";
import { ROSTER } from "./model";
import { isValidPlay } from "./storage";
import { thumbnailSvg } from "./thumbnail";

const play = { mode: "6v5" as const, steps: [formation("6v5")] };

describe("library", () => {
  const a = createEntry("6 על 5 — העברת צד", ["יתרון מספרי"], play, 1000);
  const b = createEntry("לחץ במגרש מלא", ["הגנה"], { mode: "full", steps: [formation("full")] }, 2000);

  it("filters by name and tag, newest first", () => {
    expect(filterPlays([a, b]).map((p) => p.name)).toEqual([b.name, a.name]);
    expect(filterPlays([a, b], "  העברת   צד ")).toEqual([a]);
    expect(filterPlays([a, b], "", "הגנה")).toEqual([b]);
    expect(filterPlays([a, b], "העברת", "הגנה")).toEqual([]);
  });

  it("cleans names and stores a copy of the play", () => {
    const e = createEntry("   ", [], play);
    expect(e.name).toBe("מהלך ללא שם");
    play.steps[0].ball.x = 99;
    expect(a.play.steps[0].ball.x).not.toBe(99);
    play.steps[0].ball.x = formation("6v5").ball.x;
  });

  it("names copies without clashing", () => {
    expect(copyName("X", ["X"])).toBe("X (עותק)");
    expect(copyName("X", ["X", "X (עותק)"])).toBe("X (עותק 2)");
  });

  it("exports and imports a backup without loss", () => {
    expect(parseImport(exportLibrary([a, b]))).toEqual([a, b]);
  });

  it("rejects foreign files and skips broken plays", () => {
    expect(parseImport("not json")).toBeNull();
    expect(parseImport(JSON.stringify({ plays: [] }))).toBeNull();
    const data = JSON.parse(exportLibrary([a, b]));
    delete data.plays[0].play.steps[0].pos.w4;
    data.plays[1].tags = ["הגנה", "תגית-מומצאת"];
    const back = parseImport(JSON.stringify(data))!;
    expect(back.map((p) => p.id)).toEqual([b.id]);
    expect(back[0].tags).toEqual(["הגנה"]);
  });

  it("merges an import: new plays and newer versions only", () => {
    const newer = { ...a, name: "שם חדש", updatedAt: a.updatedAt + 1 };
    const older = { ...b, updatedAt: b.updatedAt - 1 };
    const fresh = createEntry("חדש", [], play);
    expect(mergeImport([a, b], [newer, older, fresh]).map((p) => p.id)).toEqual([a.id, fresh.id]);
  });
});

describe("thumbnail", () => {
  it("draws every cap and the ball, rotated for goal-zone plays", () => {
    const svg = thumbnailSvg(play);
    expect(svg.match(/class="thumb-cap/g)).toHaveLength(ROSTER.length);
    expect(svg).toContain("thumb-ball");
    expect(svg).toContain("rotate(-90)");
    expect(thumbnailSvg({ mode: "full", steps: [formation("full")] })).not.toContain("rotate(-90)");
  });
});

describe("example plays", () => {
  const examples = examplePlays();

  it("are valid multi-step plays", () => {
    expect(examples.length).toBeGreaterThanOrEqual(3);
    for (const e of examples) {
      expect(isValidPlay(e.play), e.name).toBe(true);
      expect(e.play.steps.length, e.name).toBeGreaterThanOrEqual(3);
    }
  });

  it("never stack caps on each other or the ball on a cap", () => {
    for (const e of examples)
      e.play.steps.forEach((s, i) => {
        const caps = ROSTER.map((r) => s.pos[r.id]);
        for (let x = 0; x < caps.length; x++) {
          expect(Math.hypot(caps[x].x - s.ball.x, caps[x].y - s.ball.y), `${e.name} step ${i + 1} ball/${ROSTER[x].id}`).toBeGreaterThan(0.95);
          for (let y = x + 1; y < caps.length; y++)
            expect(Math.hypot(caps[x].x - caps[y].x, caps[x].y - caps[y].y), `${e.name} step ${i + 1}`).toBeGreaterThan(1.15);
        }
      });
  });
});
