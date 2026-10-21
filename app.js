// לוח טקטי כדורמים — מגרש 30x20 מ', יחידה אחת = 0.1 מ' (viewBox 300x200)
const NS = "http://www.w3.org/2000/svg";
const W = 300, H = 200, M = 10; // M = 1 מטר

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

// ---------- ציור הבריכה ----------
function drawPool() {
  el("rect", { x: 0, y: 0, width: W, height: H, fill: "#1f78b4" }, poolLayer);
  // קווי מסלול עדינים
  for (let y = 25; y < H; y += 25) {
    el("line", { x1: 0, y1: y, x2: W, y2: y, stroke: "#ffffff14", "stroke-width": 1 }, poolLayer);
  }
  const marks = [
    { d: 2 * M, color: "#e53935" }, // 2 מ' — אדום
    { d: 5 * M, color: "#fdd835" }, // 5 מ' — צהוב
  ];
  for (const { d, color } of marks) {
    for (const x of [d, W - d]) {
      el("line", { x1: x, y1: 0, x2: x, y2: H, stroke: color, "stroke-width": 1.2, "stroke-dasharray": "4 3" }, poolLayer);
    }
  }
  // קו אמצע
  el("line", { x1: W / 2, y1: 0, x2: W / 2, y2: H, stroke: "#ffffff", "stroke-width": 1.2, "stroke-dasharray": "4 3" }, poolLayer);
  // שערים (3 מ' רוחב)
  for (const x of [0, W]) {
    const gx = x === 0 ? -3 : W - 3;
    el("rect", { x: gx, y: H / 2 - 1.5 * M, width: 6, height: 3 * M, fill: "none", stroke: "#fff", "stroke-width": 2 }, poolLayer);
  }
}

// ---------- שחקנים וכדור ----------
const R = 6;
function startingPositions() {
  const pieces = [];
  const fieldY = [40, 80, 120, 160, 60, 140];
  const teams = [
    { id: "w", cap: "#ffffff", text: "#0d47a1", goalX: 6, fieldX: [60, 70, 70, 60, 110, 110] },
    { id: "b", cap: "#0d47a1", text: "#ffffff", goalX: W - 6, fieldX: [240, 230, 230, 240, 190, 190] },
  ];
  for (const t of teams) {
    pieces.push({ id: `${t.id}1`, x: t.goalX, y: H / 2, fill: "#e53935", color: "#fff", label: "1" });
    for (let i = 0; i < 6; i++) {
      pieces.push({ id: `${t.id}${i + 2}`, x: t.fieldX[i], y: fieldY[i], fill: t.cap, color: t.text, label: String(i + 2) });
    }
  }
  pieces.push({ id: "ball", x: W / 2, y: H / 2, ball: true });
  return pieces;
}

let pieces = startingPositions();

function renderPieces() {
  pieceLayer.innerHTML = "";
  for (const p of pieces) {
    const g = el("g", { class: "piece", "data-id": p.id, transform: `translate(${p.x} ${p.y})` }, pieceLayer);
    if (p.ball) {
      el("circle", { r: 3.5, fill: "#ffeb3b", stroke: "#333", "stroke-width": 0.8 }, g);
    } else {
      el("circle", { r: R, fill: p.fill, stroke: "#0006", "stroke-width": 1 }, g);
      const t = el("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": 7, fill: p.color }, g);
      t.textContent = p.label;
    }
  }
}

// ---------- אינטראקציה ----------
let mode = "move";
let dragging = null;
let drawing = null;
const drawings = [];

function toSvgPoint(evt) {
  const pt = board.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(board.getScreenCTM().inverse());
  return { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) };
}

board.addEventListener("pointerdown", (e) => {
  const pos = toSvgPoint(e);
  board.setPointerCapture(e.pointerId);
  if (mode === "move") {
    const g = e.target.closest(".piece");
    if (!g) return;
    const p = pieces.find((q) => q.id === g.dataset.id);
    dragging = { p, g, dx: p.x - pos.x, dy: p.y - pos.y };
    pieceLayer.appendChild(g); // מעל כולם
  } else {
    const line = el("line", {
      x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y,
      stroke: "#fff", color: "#fff", "stroke-width": 1.5,
      "marker-end": "url(#head)",
      ...(mode === "pass" ? { "stroke-dasharray": "2 2", stroke: "#ffeb3b", color: "#ffeb3b" } : {}),
    }, drawLayer);
    drawing = line;
  }
});

board.addEventListener("pointermove", (e) => {
  const pos = toSvgPoint(e);
  if (dragging) {
    const { p, g, dx, dy } = dragging;
    p.x = pos.x + dx; p.y = pos.y + dy;
    g.setAttribute("transform", `translate(${p.x} ${p.y})`);
  } else if (drawing) {
    drawing.setAttribute("x2", pos.x);
    drawing.setAttribute("y2", pos.y);
  }
});

board.addEventListener("pointerup", () => {
  if (drawing) {
    const len = Math.hypot(drawing.x2.baseVal.value - drawing.x1.baseVal.value, drawing.y2.baseVal.value - drawing.y1.baseVal.value);
    if (len < 3) drawing.remove(); else drawings.push(drawing);
  }
  dragging = null;
  drawing = null;
});

// ---------- סרגל כלים ----------
document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});
document.getElementById("undo").onclick = () => drawings.pop()?.remove();
document.getElementById("clear").onclick = () => { drawings.splice(0).forEach((d) => d.remove()); };
document.getElementById("reset").onclick = () => { pieces = startingPositions(); renderPieces(); };

drawPool();
renderPieces();
