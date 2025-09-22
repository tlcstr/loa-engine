import { EvalConfig, Player } from "./types";
import { countGroups, quadScore, centralization } from "./connectivity";
import { Position } from "./loa";

export const DEFAULT_EVAL: EvalConfig = {
  wGroups: 1200, // biggest driver: make one group
  wCentral: 2.0, // mild pull to center
  wQuads: 3.0, // density / connectivity proxy
  wMobility: 1.0, // mobility as tie-break
};

/**
 * Evaluate position from perspective of 'toMove' (higher is better).
 * Positive scores favor the side to move.
 */
export function evaluate(pos: Position, cfg: EvalConfig = DEFAULT_EVAL): number {
  const me: Player = pos.toMove;
  const opp: Player = me === 1 ? 2 : 1;

  // Terminal checks: immediate win if either side connected.
  const gMe = countGroups(pos.board, me);
  if (gMe === 1) return 100000; // winning terminal
  const gOpp = countGroups(pos.board, opp);
  if (gOpp === 1) return -100000; // losing terminal

  // Quads and centralization
  const qMe = quadScore(pos.board, me);
  const qOpp = quadScore(pos.board, opp);
  const cMe = centralization(pos.board, me);
  const cOpp = centralization(pos.board, opp);

  // Mobility (cheap): number of legal moves for me - opponent in a 1-ply approximation.
  const mobMe = pos.generateMoves().length;
  // Approximate opponent mobility by switching side without applying moves
  const mir = pos.clone();
  mir.toMove = opp;
  const mobOpp = mir.generateMoves().length;

  const score =
    cfg.wGroups * (2 - gMe - (2 - gOpp)) + // fewer groups -> higher (2 - groups) to keep sign
    cfg.wQuads * (qMe - qOpp) +
    cfg.wCentral * (cMe - cOpp) +
    cfg.wMobility * (mobMe - mobOpp);

  return score;
}
