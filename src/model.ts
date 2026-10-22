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

export interface Play { mode: ModeId; steps: Step[] }

export const MODE_VIEW: Record<ModeId, ViewId> = { full: "full", "6v6": "goal", "6v5": "goal" };

export const ROSTER: PieceSpec[] = (["w", "b"] as const).flatMap((team) =>
  Array.from({ length: 7 }, (_, i) => ({ id: `${team}${i + 1}`, team, cap: i + 1, goalie: i === 0 })),
);

export const clone = <T>(v: T): T => structuredClone(v);

export const isModeId = (v: unknown): v is ModeId => typeof v === "string" && v in MODE_VIEW;
