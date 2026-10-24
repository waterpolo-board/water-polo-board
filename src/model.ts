import type { Point, ViewId } from "./geometry";

export type Team = "w" | "b";
export type ModeId = "full" | "6v6" | "6v5";
export type DrawingKind = "move" | "pass";

export interface PieceSpec { id: string; team: Team; cap: number; goalie: boolean }

export interface Pos extends Point { excluded?: boolean }

export interface Drawing { kind: DrawingKind; x1: number; y1: number; x2: number; y2: number }

/** תמונת מצב אחת של הלוח: איפה כל שחקן, איפה הכדור. */
export interface Pose { pos: Record<string, Pos>; ball: Point }

/** שלב במהלך = תמונת מצב + החצים שצוירו עליו. */
export interface Step extends Pose { drawings: Drawing[] }

export interface Play {
  mode: ModeId;
  steps: Step[];
  /** מספר על הכובע, אם המאמן שינה אותו (ברירת מחדל: המספר ב-ROSTER). */
  labels?: Record<string, number>;
}

export const MODE_VIEW: Record<ModeId, ViewId> = { full: "full", "6v6": "goal", "6v5": "goal" };

export const ROSTER: PieceSpec[] = (["w", "b"] as const).flatMap((team) =>
  Array.from({ length: 7 }, (_, i) => ({ id: `${team}${i + 1}`, team, cap: i + 1, goalie: i === 0 })),
);

export const clone = <T>(v: T): T => structuredClone(v);

export const CAP_NUMBERS = Array.from({ length: 15 }, (_, i) => i + 1);

export const capOf = (play: Play, id: string): number =>
  play.labels?.[id] ?? ROSTER.find((r) => r.id === id)?.cap ?? 0;

/**
 * נותן לשחקן מספר חדש. אם חבר קבוצה כבר עם המספר הזה — מחליפים ביניהם,
 * כדי שלא יהיו שני כובעים זהים באותה קבוצה.
 */
export function withCapNumber(play: Play, id: string, cap: number): Record<string, number> {
  const team = ROSTER.find((r) => r.id === id)?.team;
  const labels: Record<string, number> = {};
  for (const r of ROSTER) labels[r.id] = capOf(play, r.id);
  const old = labels[id];
  const clash = ROSTER.find((r) => r.team === team && r.id !== id && labels[r.id] === cap);
  if (clash) labels[clash.id] = old;
  labels[id] = cap;
  // שומרים רק מה שונה מברירת המחדל
  for (const r of ROSTER) if (labels[r.id] === r.cap) delete labels[r.id];
  return labels;
}

export const isModeId = (v: unknown): v is ModeId => typeof v === "string" && v in MODE_VIEW;
