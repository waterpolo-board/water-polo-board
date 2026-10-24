// שכבת הציור: SVG אחד, "עולם" במטרים, ומצלמה שמזיזה/מסובבת אותו.
import { POOL, cameraTransform, distance, type Camera, type Point, type Size } from "./geometry";
import { ease, tween } from "./motion";
import { ROSTER, type Drawing } from "./model";
import type { Frame, PoseLike } from "./playback";

const NS = "http://www.w3.org/2000/svg";
const L = POOL.length;
const W = POOL.width;
const CAP_R = 0.65;
const BALL_R = 0.36;
const WAKE_MIN = 0.8; // מטרים — מתחת לזה לא מציירים שובל

type Attrs = Record<string, string | number>;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

interface PieceNode { g: SVGGElement; upright: SVGGElement; text: SVGTextElement }
interface Wake { line: SVGLineElement; grad: SVGLinearGradientElement; from: Point }

let uid = 0;

export class Board {
  private readonly defs: SVGDefsElement;
  private readonly world: SVGGElement;
  private readonly wakes: SVGGElement;
  private readonly drawingLayer: SVGGElement;
  private readonly pieceLayer: SVGGElement;
  private readonly fx: SVGGElement;
  private readonly pieces = new Map<string, PieceNode>();
  private readonly ball: { g: SVGGElement; upright: SVGGElement; body: SVGGElement; shadow: SVGEllipseElement };
  private readonly activeWakes = new Map<string, Wake>();
  reducedMotion = false;

  constructor(readonly svg: SVGSVGElement) {
    this.defs = el("defs", {}, svg);
    for (const kind of ["move", "pass"] as const) {
      const marker = el("marker", {
        id: `head-${kind}`, viewBox: "0 0 10 10", refX: 6.5, refY: 5, markerWidth: 4, markerHeight: 4, orient: "auto-start-reverse",
      }, this.defs);
      el("path", { class: `head ${kind}`, d: "M0,1 L9,5 L0,9 z" }, marker);
    }

    this.world = el("g", { class: "world" }, svg);
    this.drawPool(el("g", { class: "pool" }, this.world));
    this.wakes = el("g", { class: "wakes" }, this.world);
    this.drawingLayer = el("g", { class: "drawings" }, this.world);
    this.pieceLayer = el("g", { class: "pieces" }, this.world);
    this.fx = el("g", { class: "fx" }, this.world);

    for (const p of ROSTER) {
      const g = el("g", { class: `piece team-${p.team}${p.goalie ? " goalie" : ""}`, "data-id": p.id }, this.pieceLayer);
      const upright = el("g", {}, g);
      el("circle", { class: "hit", r: CAP_R * 1.35 }, upright); // אזור מגע נדיב לאצבע
      el("circle", { class: "cap", r: CAP_R }, upright);
      const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central" }, upright);
      t.textContent = String(p.cap);
      this.pieces.set(p.id, { g, upright, text: t });
    }

    const bg = el("g", { class: "piece ball", "data-id": "ball" }, this.pieceLayer);
    const bu = el("g", {}, bg);
    const shadow = el("ellipse", { class: "ball-shadow", rx: BALL_R * 0.95, ry: BALL_R * 0.55 }, bu);
    el("circle", { class: "hit", r: CAP_R * 1.2 }, bu);
    const body = el("g", {}, bu);
    el("circle", { class: "ball-body", r: BALL_R }, body);
    el("path", { class: "ball-seam", d: `M${-BALL_R * 0.92},0 Q0,${-BALL_R * 0.55} ${BALL_R * 0.92},0` }, body);
    this.ball = { g: bg, upright: bu, body, shadow };
  }

  private drawPool(g: SVGGElement) {
    el("rect", { class: "water", x: 0, y: 0, width: L, height: W, rx: 0.22 }, g);
    for (let y = 2.5; y < W; y += 2.5) el("line", { class: "lane", x1: 0, y1: y, x2: L, y2: y }, g);
    for (const [d, cls] of [[2, "line-2m"], [5, "line-5m"]] as const) {
      for (const x of [d, L - d]) el("line", { class: `mark ${cls}`, x1: x, y1: 0, x2: x, y2: W }, g);
    }
    el("line", { class: "mark line-half", x1: L / 2, y1: 0, x2: L / 2, y2: W }, g);
    const g0 = W / 2 - POOL.goalWidth / 2;
    const g1 = W / 2 + POOL.goalWidth / 2;
    el("polyline", { class: "goal", points: `0,${g0} -0.6,${g0} -0.6,${g1} 0,${g1}` }, g);
    el("polyline", { class: "goal", points: `${L},${g0} ${L + 0.6},${g0} ${L + 0.6},${g1} ${L},${g1}` }, g);
  }

  size(): Size {
    const r = this.svg.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  setCamera(c: Camera) {
    const size = this.size();
    this.svg.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    this.world.setAttribute("transform", cameraTransform(c, size));
    // הבריכה מסתובבת, המספרים על הכובעים נשארים ישרים
    const upright = `rotate(${-c.angle})`;
    for (const { upright: u } of this.pieces.values()) u.setAttribute("transform", upright);
    this.ball.upright.setAttribute("transform", upright);
  }

  renderFrame(f: Frame) {
    for (const [id, node] of this.pieces) {
      const p = f.pos[id];
      node.g.setAttribute("transform", `translate(${p.x} ${p.y})`);
      node.g.style.opacity = String(1 - 0.5 * p.ex);
    }
    const { x, y, lift } = f.ball;
    this.ball.g.setAttribute("transform", `translate(${x} ${y})`);
    // כדור באוויר: עולה מעל הצל וגדל מעט, הצל מתכווץ ומתבהר
    const l = this.reducedMotion ? 0 : lift;
    this.ball.body.setAttribute("transform", `translate(0 ${-l * 1.1}) scale(${1 + l * 0.45})`);
    this.ball.shadow.setAttribute("transform", `scale(${1 - l * 0.3})`);
    this.ball.shadow.style.opacity = String(0.55 - l * 0.3);
  }

  /** המספרים על הכובעים. */
  setLabels(capOf: (id: string) => number) {
    for (const [id, node] of this.pieces) node.text.textContent = String(capOf(id));
  }

  /** מלבן הכובע על המסך — כדי למקם לידו את בורר המספרים. */
  capRect(id: string): DOMRect | null {
    return this.pieces.get(id)?.upright.querySelector(".cap")?.getBoundingClientRect() ?? null;
  }

  /** הבהוב קטן כשהמספר על כובע משתנה. */
  pulseCap(id: string) {
    const cap = this.pieces.get(id)?.upright.querySelector<SVGCircleElement>(".cap");
    if (!cap || this.reducedMotion) return;
    cap.animate([{ transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
  }

  /** נקודת מגע → מטרים בבריכה. */
  toPool(e: { clientX: number; clientY: number }): Point {
    const m = this.world.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  pieceAt(target: EventTarget | null): string | null {
    return (target as Element | null)?.closest?.<SVGGElement>(".piece")?.dataset.id ?? null;
  }

  raise(id: string) {
    const g = id === "ball" ? this.ball.g : this.pieces.get(id)?.g;
    if (g) this.pieceLayer.appendChild(g);
    this.pieceLayer.appendChild(this.ball.g); // הכדור תמיד מעל כולם
  }

  setDragging(id: string | null) {
    for (const g of this.pieceLayer.children) g.classList.toggle("dragging", (g as SVGGElement).dataset.id === id);
  }

  // ---------- ציורים ----------

  private drawingNode(d: Drawing, parent: Element) {
    return el("line", { class: `drawing ${d.kind}`, x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, "marker-end": `url(#head-${d.kind})` }, parent);
  }

  /** מחליף את כל החצים. animate = החצים "נכתבים" על המים אחד אחרי השני. */
  setDrawings(list: Drawing[], animate = false) {
    this.drawingLayer.replaceChildren();
    list.forEach((d, i) => {
      const node = this.drawingNode(d, this.drawingLayer);
      if (animate && !this.reducedMotion) this.drawOn(node, d, i * 90);
    });
  }

  /** חץ בזמן ציור באצבע. מחזיר פונקציה לעדכון הקצה. */
  liveDrawing(d: Drawing): { update: (p: Point) => void; remove: () => void } {
    const node = this.drawingNode(d, this.drawingLayer);
    return {
      update: (p) => { node.setAttribute("x2", String(p.x)); node.setAttribute("y2", String(p.y)); },
      remove: () => node.remove(),
    };
  }

  /** מסכה שנחשפת לאורך הקו, כולל ראש החץ — עובד גם לקו מקווקו. */
  private drawOn(node: SVGLineElement, d: Drawing, delay: number) {
    const len = distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 });
    if (len < 0.01) return;
    const ux = (d.x2 - d.x1) / len;
    const uy = (d.y2 - d.y1) / len;
    const reach = len + 0.9; // ממשיך מעבר לקצה כדי לחשוף את ראש החץ
    const id = `reveal${++uid}`;
    const mask = el("mask", { id, maskUnits: "userSpaceOnUse", x: -10, y: -10, width: L + 20, height: W + 20 }, this.defs);
    const m = el("line", {
      x1: d.x1 - ux * 0.3, y1: d.y1 - uy * 0.3, x2: d.x1 + ux * reach, y2: d.y1 + uy * reach,
      stroke: "#fff", "stroke-width": 1.4, "stroke-linecap": "round",
      "stroke-dasharray": reach + 0.6, "stroke-dashoffset": reach + 0.6,
    }, mask);
    node.setAttribute("mask", `url(#${id})`);
    tween({
      duration: 260 + len * 45, delay, ease: ease.outQuart,
      update: (t) => m.setAttribute("stroke-dashoffset", String((reach + 0.6) * (1 - t))),
    }).done.then(() => { node.removeAttribute("mask"); mask.remove(); });
  }

  fadeDrawings(duration = 220) {
    const nodes = [...this.drawingLayer.children] as SVGElement[];
    return tween({ duration, ease: ease.outQuart, update: (t) => nodes.forEach((n) => (n.style.opacity = String(1 - t))) })
      .done.then(() => nodes.forEach((n) => n.remove()));
  }

  // ---------- שובל במים ----------

  /** מתחיל שובל לכל מי שזז יותר מ-WAKE_MIN בין שתי תמונות המצב. */
  beginWakes(from: PoseLike, to: PoseLike) {
    this.clearWakes();
    if (this.reducedMotion) return;
    const add = (id: string, a: Point, b: Point, cls: string) => {
      if (distance(a, b) < WAKE_MIN) return;
      const gid = `wake${++uid}`;
      const grad = el("linearGradient", { id: gid, class: `wake-grad ${cls}`, gradientUnits: "userSpaceOnUse", x1: a.x, y1: a.y, x2: a.x, y2: a.y }, this.defs);
      el("stop", { offset: 0, class: "wake-tail" }, grad);
      el("stop", { offset: 1, class: "wake-head" }, grad);
      const line = el("line", { class: `wake ${cls}`, x1: a.x, y1: a.y, x2: a.x, y2: a.y, stroke: `url(#${gid})` }, this.wakes);
      this.activeWakes.set(id, { line, grad, from: a });
    };
    for (const p of ROSTER) add(p.id, from.pos[p.id], to.pos[p.id], `team-${p.team}`);
    add("ball", from.ball, to.ball, "ball");
  }

  updateWakes(f: Frame) {
    for (const [id, w] of this.activeWakes) {
      const p = id === "ball" ? f.ball : f.pos[id];
      w.line.setAttribute("x2", String(p.x));
      w.line.setAttribute("y2", String(p.y));
      w.grad.setAttribute("x2", String(p.x));
      w.grad.setAttribute("y2", String(p.y));
    }
  }

  /** השובל נרגע ונעלם אחרי שהשחקנים הגיעו. */
  endWakes(duration = 700) {
    const wakes = [...this.activeWakes.values()];
    this.activeWakes.clear();
    tween({ duration, ease: ease.outQuart, update: (t) => wakes.forEach((w) => (w.line.style.opacity = String(1 - t))) })
      .done.then(() => wakes.forEach((w) => { w.line.remove(); w.grad.remove(); }));
  }

  clearWakes() {
    for (const w of this.activeWakes.values()) { w.line.remove(); w.grad.remove(); }
    this.activeWakes.clear();
  }

  // ---------- גלים ----------

  /** אדווה במים כשמניחים שחקן או כדור. */
  ripple(p: Point, strength = 1) {
    const c = el("circle", { class: "ripple", cx: p.x, cy: p.y, r: CAP_R }, this.fx);
    const grow = this.reducedMotion ? 0 : 1.8 * strength;
    tween({
      duration: 750, ease: ease.outQuart,
      update: (t) => {
        c.setAttribute("r", String(CAP_R + grow * t));
        c.style.opacity = String(0.6 * (1 - t));
      },
    }).done.then(() => c.remove());
  }
}
