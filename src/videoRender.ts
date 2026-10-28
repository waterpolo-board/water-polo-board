// ציור פריים של סרטון על canvas: אותה שפה חזותית כמו הלוח, בלי תלות ב-SVG או ב-CSS.
import { POOL, cameraFor, distance, type Camera, type Size } from "./geometry";
import { isRtl, t } from "./i18n";
import { MODE_VIEW, ROSTER, capOf, type Play } from "./model";
import type { Scene } from "./timeline";

const L = POOL.length;
const W = POOL.width;
const CAP_R = 0.65;
const BALL_R = 0.36;

export const VIDEO = { width: 1280, height: 720, fps: 30, header: 72 } as const;

/** הצבעים נקראים מהמשתנים ב-CSS, כדי שהסרטון ייראה בדיוק כמו הלוח. */
export function readPalette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    deck: v("--deck"), ink: v("--ink"), inkSoft: v("--ink-soft"), accent: v("--accent"),
    water: v("--water"), lane: v("--lane"), line2: v("--line-2m"), line5: v("--line-5m"), lineHalf: v("--line-half"), goal: v("--goal"),
    capW: v("--cap-white"), capWInk: v("--cap-white-ink"), capB: v("--cap-blue"), capBInk: v("--cap-blue-ink"),
    capG: v("--cap-goalie"), capGInk: v("--cap-goalie-ink"), capEdge: v("--cap-edge"),
    ball: v("--ball"), ballInk: v("--ball-ink"), ballShadow: v("--ball-shadow"),
    move: v("--move"), pass: v("--pass"), wakeW: v("--wake-w"), wakeB: v("--wake-b"),
  };
}
export type Palette = ReturnType<typeof readPalette>;

/** #rrggbb או #rrggbbaa → rgba עם שקיפות. */
function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const base = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${base * a})`;
}

export interface VideoPainter { paint(scene: Scene): void; poolSize: Size }

export function createPainter(ctx: CanvasRenderingContext2D, play: Play, title: string, pal: Palette): VideoPainter {
  const { width, height, header } = VIDEO;
  const poolSize = { w: width - 48, h: height - header - 30 };
  const camera: Camera = cameraFor(MODE_VIEW[play.mode], poolSize);
  const font = 'system-ui, "Segoe UI", Roboto, "Noto Sans Hebrew", Arial, sans-serif';

  function toWorld() {
    ctx.translate(24 + poolSize.w / 2, header + poolSize.h / 2);
    ctx.rotate((camera.angle * Math.PI) / 180);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.cx, -camera.cy);
  }

  /** ציור טקסט/כדור "ישר" למרות סיבוב הבריכה. */
  function upright(x: number, y: number, draw: () => void) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-camera.angle * Math.PI) / 180);
    draw();
    ctx.restore();
  }

  function line(x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function pool() {
    ctx.fillStyle = pal.water;
    ctx.beginPath();
    ctx.roundRect(0, 0, L, W, 0.22);
    ctx.fill();
    ctx.strokeStyle = pal.lane;
    ctx.lineWidth = 0.06;
    for (let y = 2.5; y < W; y += 2.5) line(0, y, L, y);
    ctx.lineWidth = 0.1;
    ctx.setLineDash([0.5, 0.42]);
    for (const [d, c] of [[2, pal.line2], [5, pal.line5]] as const) {
      ctx.strokeStyle = c;
      line(d, 0, d, W);
      line(L - d, 0, L - d, W);
    }
    ctx.strokeStyle = pal.lineHalf;
    line(L / 2, 0, L / 2, W);
    ctx.setLineDash([]);
    ctx.strokeStyle = pal.goal;
    ctx.lineWidth = 0.16;
    ctx.lineJoin = "round";
    const g0 = W / 2 - POOL.goalWidth / 2;
    const g1 = W / 2 + POOL.goalWidth / 2;
    for (const [x, out] of [[0, -0.6], [L, 0.6]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, g0);
      ctx.lineTo(x + out, g0);
      ctx.lineTo(x + out, g1);
      ctx.lineTo(x, g1);
      ctx.stroke();
    }
  }

  function wakes(scene: Scene) {
    ctx.lineCap = "round";
    for (const w of scene.wakes) {
      if (distance(w.from, w.to) < 0.05) continue;
      const color = w.cls === "ball" ? pal.ball : w.cls === "team-b" ? pal.wakeB : pal.wakeW;
      const g = ctx.createLinearGradient(w.from.x, w.from.y, w.to.x, w.to.y);
      g.addColorStop(0, alpha(color, 0));
      g.addColorStop(1, alpha(color, 0.32 * w.opacity));
      ctx.strokeStyle = g;
      ctx.lineWidth = w.cls === "ball" ? 0.22 : 1.05;
      line(w.from.x, w.from.y, w.to.x, w.to.y);
    }
  }

  function drawings(scene: Scene) {
    for (const { d, reveal, opacity } of scene.drawings) {
      const len = distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 });
      if (len < 0.01 || reveal <= 0) continue;
      const ux = (d.x2 - d.x1) / len;
      const uy = (d.y2 - d.y1) / len;
      const head = 0.56;
      const shown = Math.min(len - head * 0.6, (len + 0.9) * reveal);
      const color = d.kind === "pass" ? pal.pass : pal.move;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.14;
      ctx.lineCap = "round";
      ctx.setLineDash(d.kind === "pass" ? [0.34, 0.3] : []);
      if (shown > 0) line(d.x1, d.y1, d.x1 + ux * shown, d.y1 + uy * shown);
      ctx.setLineDash([]);
      if ((len + 0.9) * reveal >= len) {
        // ראש החץ מופיע כשהקו מגיע לקצה
        const px = -uy, py = ux;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(d.x2 + ux * 0.1, d.y2 + uy * 0.1);
        ctx.lineTo(d.x2 - ux * head + px * head * 0.45, d.y2 - uy * head + py * head * 0.45);
        ctx.lineTo(d.x2 - ux * head - px * head * 0.45, d.y2 - uy * head - py * head * 0.45);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function pieces(scene: Scene) {
    for (const r of ROSTER) {
      const p = scene.frame.pos[r.id];
      const [fill, ink] = r.goalie ? [pal.capG, pal.capGInk] : r.team === "w" ? [pal.capW, pal.capWInk] : [pal.capB, pal.capBInk];
      ctx.globalAlpha = 1 - 0.5 * p.ex;
      ctx.fillStyle = fill;
      ctx.strokeStyle = pal.capEdge;
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CAP_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      upright(p.x, p.y, () => {
        ctx.fillStyle = ink;
        ctx.font = `600 0.72px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(capOf(play, r.id)), 0, 0.03);
      });
    }
    ctx.globalAlpha = 1;
    const { x, y, lift } = scene.frame.ball;
    upright(x, y, () => {
      ctx.fillStyle = alpha(pal.ballShadow, 0.55 - lift * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, BALL_R * 0.95 * (1 - lift * 0.3), BALL_R * 0.55 * (1 - lift * 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, -lift * 1.1);
      ctx.scale(1 + lift * 0.45, 1 + lift * 0.45);
      ctx.fillStyle = pal.ball;
      ctx.strokeStyle = pal.ballInk;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(-BALL_R * 0.92, 0);
      ctx.quadraticCurveTo(0, -BALL_R * 0.55, BALL_R * 0.92, 0);
      ctx.stroke();
    });
  }

  function chrome(scene: Scene) {
    // בעברית השם מימין והשלב משמאל; באנגלית ובסרבית הפוך
    const rtl = isRtl();
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textBaseline = "middle";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillStyle = pal.ink;
    ctx.font = `600 30px ${font}`;
    ctx.fillText(title, rtl ? width - 32 : 32, header / 2 + 4, width * 0.62);
    ctx.textAlign = rtl ? "left" : "right";
    ctx.fillStyle = pal.inkSoft;
    ctx.font = `400 22px ${font}`;
    ctx.fillText(t("video.stepOf", { n: scene.step + 1, total: play.steps.length }), rtl ? 32 : width - 32, header / 2 + 4);
    // נקודות התקדמות בין השלבים
    const n = play.steps.length;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i <= scene.step ? pal.accent : alpha(pal.inkSoft, 0.35);
      ctx.beginPath();
      ctx.arc(width / 2 + (rtl ? 1 : -1) * ((n - 1) * 11 - i * 22), height - 12, 5, 0, Math.PI * 2); // בכיוון הקריאה, בתחתית
      ctx.fill();
    }
    ctx.direction = "ltr";
  }

  return {
    poolSize,
    paint(scene) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = pal.deck;
      ctx.fillRect(0, 0, width, height);
      chrome(scene);
      ctx.save();
      toWorld();
      pool();
      wakes(scene);
      drawings(scene);
      pieces(scene);
      ctx.restore();
    },
  };
}
