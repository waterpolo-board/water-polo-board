import "./style.css";
import "./library.css";
import { Board } from "./board";
import { cameraFor, clampToPool, distance, lerpCamera, type Camera, type Point } from "./geometry";
import { formation } from "./formations";
import { History } from "./history";
import { CAP_NUMBERS, MODE_VIEW, ROSTER, capOf, clone, isModeId, withCapNumber, type Drawing, type DrawingKind, type ModeId, type Play, type Step } from "./model";
import { ease, prefersReducedMotion, tween, wait, type Tween } from "./motion";
import { frameBetween, frameOf, transitionDuration, type Frame, type PoseLike } from "./playback";
import { initLibrary } from "./libraryUi";
import type { SavedPlay } from "./library";
import { load, save, type Saved } from "./storage";

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const $$ = <T extends Element>(sel: string) => [...document.querySelectorAll<T>(sel)];

const board = new Board($<SVGSVGElement>("#board"));
const history = new History<Saved>();

// ---------- מצב ----------
const fromUrl = new URLSearchParams(location.search).get("mode");
const initial: Saved =
  (isModeId(fromUrl) ? null : load()) ?? { play: { mode: isModeId(fromUrl) ? fromUrl : "full", steps: [formation(isModeId(fromUrl) ? fromUrl : "full")] }, cur: 0 };

let play: Play = initial.play;
let cur = initial.cur;
let libraryId: string | undefined = initial.libraryId; // המהלך הפתוח שמור בספרייה?
let tool: "drag" | "numbers" | DrawingKind = "drag";
let speed = 1;
let shown: Frame = frameOf(play.steps[cur]); // מה שמוצג כרגע על המסך, גם באמצע תנועה
let camera: Camera = cameraFor(MODE_VIEW[play.mode], board.size());
let playing = false;

let motion: Tween | null = null;   // תנועת השחקנים
let cameraMotion: Tween | null = null;

const step = (): Step => play.steps[cur];
const snapshot = (): Saved => ({ play, cur, libraryId });

function commit() {
  save(snapshot());
  board.setLabels((id) => capOf(play, id));
  renderUi();
}

function mutate(fn: () => void) {
  history.push(snapshot());
  fn();
  commit();
}

// ---------- תנועה ----------
const reduced = () => prefersReducedMotion();

function show(f: Frame) {
  shown = f;
  board.renderFrame(f);
}

/** מחליק את כל השחקנים מהמצב המוצג למצב יעד. */
function glideTo(target: PoseLike, { duration = 520, stagger = 0, wakes = false } = {}): Promise<boolean> {
  motion?.cancel();
  const from: PoseLike = { pos: shown.pos, ball: shown.ball };
  if (wakes) board.beginWakes(from, target);
  const d = reduced() ? 0 : duration;
  motion = tween({
    duration: d, ease: ease.linear, // ההאטה מחושבת לכל שחקן בתוך frameBetween
    update: (t) => {
      const f = frameBetween(from, target, t, { stagger: reduced() ? 0 : stagger });
      show(f);
      if (wakes) board.updateWakes(f);
    },
  });
  return motion.done.then((finished) => {
    if (wakes) board.endWakes();
    return finished;
  });
}

/** תנועת מצלמה: סיבוב וזום חלקים בין בריכה מלאה לאזור השער. */
function moveCamera(target: Camera, duration = 820) {
  cameraMotion?.cancel();
  const from = camera;
  cameraMotion = tween({
    duration: reduced() ? 0 : duration, ease: ease.inOutCubic,
    update: (t) => {
      camera = lerpCamera(from, target, t);
      board.setCamera(camera);
    },
  });
}

// ---------- פעולות ----------
function setMode(mode: ModeId) {
  stopPlayback();
  mutate(() => {
    // המספרים שהמאמן בחר נשארים גם כשעוברים מצב
    play = { mode, steps: [formation(mode)], ...(play.labels ? { labels: play.labels } : {}) };
    cur = 0;
    libraryId = undefined; // לוח חדש, לא קשור למהלך שמור
  });
  board.fadeDrawings();
  moveCamera(cameraFor(MODE_VIEW[mode], board.size()));
  glideTo(step(), { duration: 900, stagger: 0.025 });
}

function selectStep(i: number) {
  if (i === cur || playing) return;
  cur = i;
  commit();
  board.setDrawings(step().drawings, true);
  glideTo(step(), { duration: 480 });
}

function addStep() {
  stopPlayback();
  mutate(() => {
    const next = clone(step());
    next.drawings = [];
    play.steps.splice(cur + 1, 0, next);
    cur += 1;
  });
  board.setDrawings([]);
  pulseNewChip();
}

function deleteStep() {
  if (play.steps.length < 2) return;
  stopPlayback();
  mutate(() => {
    play.steps.splice(cur, 1);
    cur = Math.min(cur, play.steps.length - 1);
  });
  board.setDrawings(step().drawings);
  glideTo(step(), { duration: 420 });
}

function resetFormation() {
  stopPlayback();
  mutate(() => {
    const f = formation(play.mode);
    play.steps[cur] = { ...f, drawings: step().drawings };
  });
  glideTo(step(), { duration: 700, stagger: 0.02 });
}

function clearDrawings() {
  if (step().drawings.length === 0) return;
  mutate(() => (step().drawings = []));
  board.fadeDrawings();
}

function restore(s: Saved | undefined) {
  if (!s) return;
  stopPlayback();
  const modeChanged = s.play.mode !== play.mode;
  play = s.play;
  cur = s.cur;
  libraryId = s.libraryId;
  commit();
  if (modeChanged) moveCamera(cameraFor(MODE_VIEW[play.mode], board.size()));
  board.setDrawings(step().drawings);
  glideTo(step(), { duration: 420 });
}

// ---------- ספרייה ----------
function openSaved(entry: SavedPlay, autoplay: boolean) {
  stopPlayback();
  mutate(() => {
    play = clone(entry.play);
    cur = 0;
    libraryId = entry.id;
  });
  moveCamera(cameraFor(MODE_VIEW[play.mode], board.size()));
  board.setDrawings(autoplay ? [] : step().drawings, !autoplay);
  glideTo(step(), { duration: 760, stagger: 0.015 }).then((ok) => {
    if (ok && autoplay) startPlayback();
  });
}

// ---------- ניגון מהלך ----------
async function startPlayback() {
  if (play.steps.length < 2) return;
  playing = true;
  renderUi();

  if (cur === play.steps.length - 1) {
    cur = 0;
    renderUi();
    board.setDrawings([]);
    if (!(await glideTo(step(), { duration: 600, stagger: 0.015 }))) return;
  }
  board.setDrawings(step().drawings, true);
  if (!(await hold(step().drawings.length ? 900 : 350))) return;

  while (playing && cur < play.steps.length - 1) {
    const a = play.steps[cur];
    const b = play.steps[cur + 1];
    board.fadeDrawings(380);
    if (!(await glideTo(b, { duration: transitionDuration(a, b, speed), wakes: true }))) return;
    cur += 1;
    renderUi();
    board.setDrawings(step().drawings, true);
    if (!(await hold(step().drawings.length ? 900 : 450))) return;
  }
  playing = false;
  commit();
}

function hold(ms: number) {
  motion = wait(ms / speed);
  return motion.done.then((ok) => ok && playing);
}

function stopPlayback() {
  if (!playing) return;
  playing = false;
  motion?.cancel();
  board.clearWakes();
  board.setDrawings(step().drawings);
  glideTo(step(), { duration: 260 });
  commit();
}

// ---------- מגע ----------
const svg = board.svg;
let drag: { id: string; offset: Point; before: Saved } | null = null;
let live: { d: Drawing; node: ReturnType<Board["liveDrawing"]> } | null = null;

svg.addEventListener("pointerdown", (e) => {
  if (playing) return stopPlayback();
  if (tool === "numbers") {
    const id = board.pieceAt(e.target);
    if (id && id !== "ball") openCapPicker(id);
    else closeCapPicker();
    return;
  }
  const p = board.toPool(e);
  svg.setPointerCapture(e.pointerId);
  const id = tool === "drag" ? board.pieceAt(e.target) : null;
  if (id) {
    motion?.cancel(); // אם השחקנים עוד מחליקים — קופצים ליעד ומתחילים לגרור משם
    show(frameOf(step()));
    const at = id === "ball" ? step().ball : step().pos[id];
    drag = { id, offset: { x: at.x - p.x, y: at.y - p.y }, before: clone(snapshot()) };
    board.raise(id);
    board.setDragging(id);
  } else if (tool === "move" || tool === "pass") {
    const d: Drawing = { kind: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    live = { d, node: board.liveDrawing(d) };
  }
});

svg.addEventListener("pointermove", (e) => {
  const p = board.toPool(e);
  if (drag) {
    const next = clampToPool({ x: p.x + drag.offset.x, y: p.y + drag.offset.y });
    const s = step();
    if (drag.id === "ball") s.ball = next;
    else s.pos[drag.id] = { ...s.pos[drag.id], ...next };
    show(frameOf(s));
  } else if (live) {
    live.d.x2 = p.x;
    live.d.y2 = p.y;
    live.node.update(p);
  }
});

function endPointer() {
  if (drag) {
    const at = drag.id === "ball" ? step().ball : step().pos[drag.id];
    const before = drag.before.play.steps[drag.before.cur];
    const was = drag.id === "ball" ? before.ball : before.pos[drag.id];
    if (distance(at, was) > 0.05) {
      history.push(drag.before);
      board.ripple(at, drag.id === "ball" ? 0.7 : 1);
      commit();
    }
    board.setDragging(null);
    drag = null;
  }
  if (live) {
    const { d, node } = live;
    live = null;
    if (distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) < 0.5) return node.remove();
    mutate(() => step().drawings.push(d));
  }
}
svg.addEventListener("pointerup", endPointer);
svg.addEventListener("pointercancel", endPointer);

// ---------- מספרי כובעים ----------
const picker = $<HTMLElement>("#cap-picker");
const pickerTitle = $<HTMLElement>("#cap-picker-title");
const pickerGrid = picker.querySelector<HTMLElement>(".cap-grid")!;
let pickerFor: string | null = null;

for (const n of CAP_NUMBERS) {
  const b = document.createElement("button");
  b.className = "cap-num";
  b.textContent = String(n);
  b.dataset.n = String(n);
  b.addEventListener("click", () => pickerFor && setCap(pickerFor, n));
  pickerGrid.append(b);
}

function openCapPicker(id: string) {
  pickerFor = id;
  const spec = ROSTER.find((r) => r.id === id)!;
  const current = capOf(play, id);
  pickerTitle.textContent = `${spec.team === "w" ? "לבנים" : "כחולים"}${spec.goalie ? " · שוער" : ""} · כרגע ${current}`;
  const taken = new Set(ROSTER.filter((r) => r.team === spec.team && r.id !== id).map((r) => capOf(play, r.id)));
  for (const b of pickerGrid.querySelectorAll<HTMLButtonElement>(".cap-num")) {
    const n = Number(b.dataset.n);
    b.setAttribute("aria-pressed", String(n === current));
    b.classList.toggle("taken", taken.has(n)); // תפוס = יתחלף עם חבר הקבוצה
    b.title = taken.has(n) ? "יתחלף עם השחקן שיש לו את המספר הזה" : "";
  }
  picker.hidden = false;
  // ליד הכובע, בתוך המסך
  const r = board.capRect(id);
  const pw = picker.offsetWidth;
  const ph = picker.offsetHeight;
  if (r) {
    const below = r.bottom + 10 + ph < innerHeight;
    const top = below ? r.bottom + 10 : r.top - 10 - ph;
    const left = Math.min(innerWidth - pw - 12, Math.max(12, r.left + r.width / 2 - pw / 2));
    picker.style.top = `${Math.max(12, top)}px`;
    picker.style.left = `${left}px`;
  }
  picker.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
}

function closeCapPicker() {
  picker.hidden = true;
  pickerFor = null;
}

function setCap(id: string, n: number) {
  closeCapPicker();
  if (capOf(play, id) === n) return;
  const before = new Map(ROSTER.map((r) => [r.id, capOf(play, r.id)]));
  mutate(() => {
    const labels = withCapNumber(play, id, n);
    if (Object.keys(labels).length) play.labels = labels;
    else delete play.labels;
  });
  for (const r of ROSTER) if (before.get(r.id) !== capOf(play, r.id)) board.pulseCap(r.id);
}

document.addEventListener("pointerdown", (e) => {
  if (!picker.hidden && !picker.contains(e.target as Node) && !svg.contains(e.target as Node)) closeCapPicker();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !picker.hidden) closeCapPicker();
});

// ---------- ממשק ----------
const stepsNav = $<HTMLElement>("#steps");
const playBtn = $<HTMLButtonElement>("#play");
const speedBtn = $<HTMLButtonElement>("#speed");
const playName = $<HTMLElement>("#play-name");

function renderUi() {
  for (const b of $$<HTMLButtonElement>("[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === play.mode));
  for (const b of $$<HTMLButtonElement>("[data-tool]")) b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
  $<HTMLButtonElement>("#undo").disabled = !history.canUndo;
  $<HTMLButtonElement>("#redo").disabled = !history.canRedo;
  $<HTMLButtonElement>("#delete-step").disabled = play.steps.length < 2;
  playBtn.disabled = play.steps.length < 2;
  playBtn.classList.toggle("is-playing", playing);
  playBtn.querySelector(".label")!.textContent = playing ? "עצור" : "הפעל מהלך";
  document.body.classList.toggle("is-playing", playing);
  speedBtn.textContent = `מהירות ${speed}×`;

  // שם המהלך הפתוח, וסימון אם יש שינויים שעוד לא נשמרו
  const saved = library?.entry(libraryId);
  playName.textContent = saved ? saved.name : "";
  playName.hidden = !saved;
  const dirty = !!saved && JSON.stringify(saved.play) !== JSON.stringify(play);
  playName.classList.toggle("dirty", dirty);
  playName.title = dirty ? "יש שינויים שלא נשמרו" : "";

  // כפתורי שלבים: משתמשים מחדש בקיימים כדי לא לשבור אנימציות
  const chips = [...stepsNav.children] as HTMLButtonElement[];
  while (chips.length > play.steps.length) chips.pop()!.remove();
  while (chips.length < play.steps.length) {
    const b = document.createElement("button");
    b.className = "step-chip";
    b.addEventListener("click", () => selectStep(Number(b.dataset.index)));
    stepsNav.appendChild(b);
    chips.push(b);
  }
  chips.forEach((b, i) => {
    b.dataset.index = String(i);
    b.textContent = String(i + 1);
    b.setAttribute("aria-label", `שלב ${i + 1}`);
    if (i === cur) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });
}

function pulseNewChip() {
  const chip = stepsNav.children[cur] as HTMLElement | undefined;
  if (!chip || reduced()) return;
  chip.animate(
    [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
    { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
  chip.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

for (const b of $$<HTMLButtonElement>("[data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode as ModeId));
for (const b of $$<HTMLButtonElement>("[data-tool]")) b.addEventListener("click", () => {
  tool = b.dataset.tool as typeof tool;
  closeCapPicker();
  document.body.classList.toggle("tool-numbers", tool === "numbers");
  renderUi();
});
$("#undo").addEventListener("click", () => restore(history.undo(snapshot())));
$("#redo").addEventListener("click", () => restore(history.redo(snapshot())));
$("#clear").addEventListener("click", clearDrawings);
$("#reset").addEventListener("click", resetFormation);
$("#add-step").addEventListener("click", addStep);
$("#delete-step").addEventListener("click", deleteStep);
playBtn.addEventListener("click", () => (playing ? stopPlayback() : startPlayback()));
speedBtn.addEventListener("click", () => {
  speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
  renderUi();
});

// מסך שמשנה גודל (סיבוב טאבלט): מתאימים את המצלמה בלי אנימציה
new ResizeObserver(() => {
  cameraMotion?.cancel();
  cameraMotion = null;
  camera = cameraFor(MODE_VIEW[play.mode], board.size());
  board.setCamera(camera);
}).observe(board.svg);

const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
board.reducedMotion = motionQuery.matches;
motionQuery.addEventListener("change", () => (board.reducedMotion = motionQuery.matches));

// ---------- פתיחה ----------
let library: Awaited<ReturnType<typeof initLibrary>> | null = null;

board.setCamera(camera);
board.setDrawings(step().drawings);
board.setLabels((id) => capOf(play, id));
show(shown);
renderUi();

initLibrary({
  current: () => ({ play, libraryId }),
  open: openSaved,
  linked: (id) => {
    libraryId = id;
    commit();
  },
}).then((lib) => {
  library = lib;
  $("#open-library").addEventListener("click", () => lib.openPanel());
  $("#save-play").addEventListener("click", () => lib.openPanel(true));
  renderUi();
});
