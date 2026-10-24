// תמונה ממוזערת של מהלך: השלב הראשון והחצים שלו, באותה זווית כמו על הלוח.
import { POOL } from "./geometry";
import { MODE_VIEW, ROSTER, type Play } from "./model";

const L = POOL.length;
const W = POOL.width;
const g0 = W / 2 - POOL.goalWidth / 2;
const g1 = W / 2 + POOL.goalWidth / 2;

const n = (v: number) => Math.round(v * 100) / 100;

export function thumbnailSvg(play: Play): string {
  const s = play.steps[0];
  const goalView = MODE_VIEW[play.mode] === "goal";
  // תצוגת שער: אותו סיבוב כמו המצלמה — השער למעלה, רוחב הבריכה לרוחב
  const viewBox = goalView ? `-0.6 -1.1 ${W + 1.2} ${L / 2 + 2.3}` : `-0.9 -0.5 ${L + 1.8} ${W + 1}`;
  const world = goalView ? ` transform="translate(0 ${L}) rotate(-90)"` : "";

  const parts: string[] = [
    `<rect class="water" x="0" y="0" width="${L}" height="${W}" rx="0.3"/>`,
    ...[2, L - 2].map((x) => `<line class="mark line-2m" x1="${x}" y1="0" x2="${x}" y2="${W}"/>`),
    ...[5, L - 5].map((x) => `<line class="mark line-5m" x1="${x}" y1="0" x2="${x}" y2="${W}"/>`),
    `<line class="mark line-half" x1="${L / 2}" y1="0" x2="${L / 2}" y2="${W}"/>`,
    `<polyline class="goal" points="0,${g0} -0.6,${g0} -0.6,${g1} 0,${g1}"/>`,
    `<polyline class="goal" points="${L},${g0} ${L + 0.6},${g0} ${L + 0.6},${g1} ${L},${g1}"/>`,
    ...s.drawings.map(
      (d) => `<line class="drawing ${d.kind}" x1="${n(d.x1)}" y1="${n(d.y1)}" x2="${n(d.x2)}" y2="${n(d.y2)}"/>`,
    ),
    ...ROSTER.map(({ id, team, goalie }) => {
      const p = s.pos[id];
      const cls = `thumb-cap team-${team}${goalie ? " goalie" : ""}${p.excluded ? " excluded" : ""}`;
      return `<circle class="${cls}" cx="${n(p.x)}" cy="${n(p.y)}" r="0.75"/>`;
    }),
    `<circle class="thumb-ball" cx="${n(s.ball.x)}" cy="${n(s.ball.y)}" r="0.5"/>`,
  ];

  return `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false"><g${world}>${parts.join("")}</g></svg>`;
}
