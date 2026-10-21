// לוח טקטי כדורמים — המצב נשמר במטרים; ההמרה למסך רק בשכבת הציור.
// x = לאורך הבריכה (0 = שער לבן, L = שער כחול), y = לרוחב (0..W)
const NS = "http://www.w3.org/2000/svg";
const L = 25, W = 20;          // בריכת נשים/נערות
const U = 10;                  // יחידות SVG למטר
const GOAL_W = 3;
const R = 0.65;                // רדיוס כובע במטרים

const board = document.getElementById("board");
const poolLayer = document.getElementById("pool");
const drawLayer = document.getElementById("drawings");
const pieceLayer = document.getElementById("pieces");

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

// ---------- תצוגות ----------
// full: כל הבריכה, השערים משמאל ומימין.
// goal: חצי ההתקפה על השער הכחול, מסובב 90° כך שהשער למעלה והרוחב לאורך המסך.
const VIEWS = {
  full: {
    toScreen: (x, y) => [x * U, y * U],
    toPool: (sx, sy) => [sx / U, sy / U],
    viewBox: [-8, -6, L * U + 16, W * U + 12],
  },
  goal: {
    toScreen: (x, y) => [y * U, (L - x) * U],
    toPool: (sx, sy) => [L - sy / U, sx / U],
    viewBox: [-6, -10, W * U + 12, (L / 2 + 1) * U + 14],
    minX: L / 2 - 1,
  },
};
let view = VIEWS.full;

// ---------- מערכים ----------
function team(prefix, fill, text, spots) {
  return spots.map(([x, y, extra = {}], i) => ({ id: `${prefix}${i + 1}`, x, y, fill, text, label: String(i + 1), ...extra }));
}
const WHITE = ["var(--cap-white)", "var(--cap-white-ink)"];
const BLUE = ["var(--cap-blue)", "var(--cap-blue-ink)"];
const GOALIE = { fill: "var(--cap-goalie)", text: "var(--cap-goalie-ink)" };

const FORMATIONS = {
  // פתיחה: כל קבוצה בחצי שלה
  full: () => [
    ...team("w", ...WHITE, [[0.6, 10, GOALIE], [6, 4], [7, 8], [7, 12], [6, 16], [10.5, 6], [10.5, 14]]),
    ...team("b", ...BLUE, [[L - 0.6, 10, GOALIE], [L - 6, 4], [L - 7, 8], [L - 7, 12], [L - 6, 16], [L - 10.5, 6], [L - 10.5, 14]]),
    { id: "ball", ball: true, x: L / 2, y: W / 2 },
  ],
  // 6 על 6: התקפת 3-3 מול הגנה אישית
  "6v6": () => [
    ...team("w", ...WHITE, [[0.6, 10, GOALIE], [L - 2, 3.5], [L - 6, 5], [L - 7.5, 10], [L - 6, 15], [L - 2, 16.5], [L - 2.5, 10]]),
    ...team("b", ...BLUE, [[L - 0.3, 10, GOALIE], [L - 1.2, 5], [L - 4.6, 5.8], [L - 6.1, 10], [L - 4.6, 14.2], [L - 1.2, 15], [L - 1.4, 10.9]]),
    { id: "ball", ball: true, x: L - 8.6, y: 10 },
  ],
  // 6 על 5: התקפת 4-2 מול הגנת אזור, שחקן כחול מורחק באזור הכניסה מחדש
  "6v5": () => [
    ...team("w", ...WHITE, [[0.6, 10, GOALIE], [L - 5, 2.5], [L - 5.5, 7.5], [L - 5.5, 12.5], [L - 5, 17.5], [L - 2, 7.5], [L - 2, 12.5]]),
    ...team("b", ...BLUE, [[L - 0.3, 10, GOALIE], [L - 3.8, 4], [L - 4.4, 10], [L - 3.8, 16], [L - 1.3, 8.6], [L - 1.3, 11.4], [L - 0.4, 19.2, { excluded: true }]]),
    { id: "ball", ball: true, x: L - 6.6, y: 7.5 },
  ],
};
let mode = "full";
let pieces = FORMATIONS[mode]();

// ---------- ציור ----------
function line(x1, y1, x2, y2, attrs, parent) {
  const [a, b] = view.toScreen(x1, y1);
  const [c, d] = view.toScreen(x2, y2);
  return el("line", { x1: a, y1: b, x2: c, y2: d, ...attrs }, parent);
}

function drawPool() {
  poolLayer.innerHTML = "";
  const [vx, vy, vw, vh] = view.viewBox;
  board.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);

  const [x0, y0] = view.toScreen(view.minX ?? 0, 0);
  const [x1, y1] = view.toScreen(L, W);
  el("rect", {
    x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0),
    fill: "var(--water)", rx: 2,
  }, poolLayer);

  for (let y = 2.5; y < W; y += 2.5) line(view.minX ?? 0, y, L, y, { stroke: "var(--lane)", "stroke-width": 0.6 }, poolLayer);

  const marks = [[2, "var(--line-2m)"], [5, "var(--line-5m)"]];
  for (const [d, color] of marks) {
    for (const x of [d, L - d]) line(x, 0, x, W, { stroke: color, "stroke-width": 1, "stroke-dasharray": "5 4" }, poolLayer);
  }
  line(L / 2, 0, L / 2, W, { stroke: "var(--line-half)", "stroke-width": 1, "stroke-dasharray": "5 4" }, poolLayer);

  for (const gx of [0, L]) {
    const out = gx === 0 ? -0.6 : 0.6;
    const pts = [[gx, W / 2 - GOAL_W / 2], [gx + out, W / 2 - GOAL_W / 2], [gx + out, W / 2 + GOAL_W / 2], [gx, W / 2 + GOAL_W / 2]]
      .map(([x, y]) => view.toScreen(x, y).join(",")).join(" ");
    el("polyline", { points: pts, fill: "none", stroke: "var(--goal)", "stroke-width": 1.6, "stroke-linejoin": "round" }, poolLayer);
  }
}

function renderPieces() {
  pieceLayer.innerHTML = "";
  for (const p of pieces) {
    const [sx, sy] = view.toScreen(p.x, p.y);
    const g = el("g", { class: "piece" + (p.excluded ? " excluded" : ""), "data-id": p.id, transform: `translate(${sx} ${sy})` }, pieceLayer);
    if (p.ball) {
      el("circle", { r: 0.38 * U, fill: "var(--ball)", stroke: "var(--ball-ink)", "stroke-width": 0.7 }, g);
      continue;
    }
    el("circle", { r: R * U, fill: p.fill, stroke: "var(--cap-edge)", "stroke-width": 0.8 }, g);
    const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": 6.5, fill: p.text }, g);
    t.textContent = p.label;
  }
}

const drawings = [];
function renderDrawings() {
  drawLayer.innerHTML = "";
  for (const d of drawings) renderDrawing(d);
}
function renderDrawing(d) {
  const color = d.kind === "pass" ? "var(--pass)" : "var(--move)";
  d.node = line(d.x1, d.y1, d.x2, d.y2, {
    stroke: color, style: `color:${color}`, "stroke-width": 1.4, "stroke-linecap": "round",
    "marker-end": "url(#head)", ...(d.kind === "pass" ? { "stroke-dasharray": "2.5 2.5" } : {}),
  }, drawLayer);
}

function render() { drawPool(); renderDrawings(); renderPieces(); }

// ---------- אינטראקציה ----------
let tool = "move";
let dragging = null;
let drawing = null;

function toPoolPoint(evt) {
  const pt = board.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const s = pt.matrixTransform(board.getScreenCTM().inverse());
  const [x, y] = view.toPool(s.x, s.y);
  return { x: Math.max(-0.5, Math.min(L + 0.5, x)), y: Math.max(-0.5, Math.min(W + 0.5, y)) };
}

board.addEventListener("pointerdown", (e) => {
  const pos = toPoolPoint(e);
  board.setPointerCapture(e.pointerId);
  if (tool === "move") {
    const g = e.target.closest(".piece");
    if (!g) return;
    const p = pieces.find((q) => q.id === g.dataset.id);
    dragging = { p, g, dx: p.x - pos.x, dy: p.y - pos.y };
    pieceLayer.appendChild(g);
  } else {
    drawing = { kind: tool, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
    renderDrawing(drawing);
  }
});

board.addEventListener("pointermove", (e) => {
  const pos = toPoolPoint(e);
  if (dragging) {
    const { p, g, dx, dy } = dragging;
    p.x = pos.x + dx; p.y = pos.y + dy;
    const [sx, sy] = view.toScreen(p.x, p.y);
    g.setAttribute("transform", `translate(${sx} ${sy})`);
  } else if (drawing) {
    drawing.x2 = pos.x; drawing.y2 = pos.y;
    const [sx, sy] = view.toScreen(pos.x, pos.y);
    drawing.node.setAttribute("x2", sx);
    drawing.node.setAttribute("y2", sy);
  }
});

board.addEventListener("pointerup", () => {
  if (drawing) {
    if (Math.hypot(drawing.x2 - drawing.x1, drawing.y2 - drawing.y1) < 0.4) drawing.node.remove();
    else drawings.push(drawing);
  }
  dragging = null;
  drawing = null;
});

// ---------- סרגל כלים ----------
function setActive(attr, value) {
  document.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value)));
}

document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    view = mode === "full" ? VIEWS.full : VIEWS.goal;
    pieces = FORMATIONS[mode]();
    drawings.length = 0;
    setActive("data-mode", mode);
    render();
  });
});
document.querySelectorAll("[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => { tool = btn.dataset.tool; setActive("data-tool", tool); });
});
document.getElementById("undo").onclick = () => drawings.pop()?.node.remove();
document.getElementById("clear").onclick = () => { drawings.splice(0).forEach((d) => d.node.remove()); };
document.getElementById("reset").onclick = () => { pieces = FORMATIONS[mode](); renderPieces(); };

const startMode = new URLSearchParams(location.search).get("mode");
if (startMode && FORMATIONS[startMode]) document.querySelector(`[data-mode="${startMode}"]`).click(); else render();
