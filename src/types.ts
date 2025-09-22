/**
 * Core types for Lines of Action engine.
 */
export type Player = 1 | 2; // 1 = Black, 2 = White

export enum Piece {
  Empty = 0,
  Black = 1,
  White = 2,
}

export interface Move {
  from: number; // 0..63
  to: number; // 0..63
}

export interface SearchOptions {
  depth?: number;
  timeMs?: number;
  ttSize?: number;
}

export interface MctsOptions {
  sims: number;
  cPuct?: number;
  temperature?: number;
}

export interface PVModel {
  // Return normalized policy over legal moves and a value in [-1, 1] from current player's perspective.
  predict(
    state: Uint8Array,
    toMove: Player
  ): Promise<{ policy: Map<string, number>; value: number }>;
}

export interface EvalConfig {
  wGroups: number;
  wCentral: number;
  wQuads: number;
  wMobility: number;
}

export const DIRS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
];

export function idx(x: number, y: number): number {
  return y * 8 + x;
}
export function inBoard(x: number, y: number): boolean {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function coordToStr(i: number): string {
  const x = i % 8,
    y = Math.floor(i / 8);
  // a1 is bottom-left (x=0,y=7), so we mirror rank for display.
  const file = String.fromCharCode("a".charCodeAt(0) + x);
  const rank = (8 - y).toString();
  return file + rank;
}

export function moveToStr(m: Move): string {
  return coordToStr(m.from) + "->" + coordToStr(m.to);
}
