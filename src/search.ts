import { Move, Player, SearchOptions, moveToStr } from "./types";
import { Position } from "./loa";
import { evaluate } from "./eval";

type Bound = "EXACT" | "LOWER" | "UPPER";
interface TTEntry {
  depth: number;
  value: number;
  bound: Bound;
  best?: Move;
}

class TranspositionTable {
  private table: Map<string, TTEntry>;
  private max: number;
  constructor(size: number) {
    this.table = new Map();
    this.max = Math.max(1024, size);
  }
  private key(pos: Position): string {
    // Simple stable key: board bytes + toMove
    return `${pos.toMove}|` + Buffer.from(pos.board).toString("base64");
  }
  get(pos: Position): TTEntry | undefined {
    return this.table.get(this.key(pos));
  }
  put(pos: Position, e: TTEntry) {
    if (this.table.size > this.max) {
      // naive aging: delete first key
      const k = this.table.keys().next().value;
      if (k) this.table.delete(k);
    }
    this.table.set(this.key(pos), e);
  }
}

function orderMoves(pos: Position, moves: Move[], hint?: Move): Move[] {
  // Simple ordering: TT move first, then captures, then by centrality of destination.
  const opp: Player = pos.toMove === 1 ? 2 : 1;
  const b = pos.board;
  return moves.slice().sort((a, bmove) => {
    if (hint && a.from === hint.from && a.to === hint.to) return -1;
    if (hint && bmove.from === hint.from && bmove.to === hint.to) return 1;
    const ta = b[a.to],
      tb = bmove.to;
    const capA = ta !== 0 && !sameColor(b[a.from], ta) ? 1 : 0;
    const capB = b[tb] !== 0 && !sameColor(b[bmove.from], b[tb]) ? 1 : 0;
    if (capA !== capB) return capB - capA;
    const ca = centralityDest(a.to),
      cb = centralityDest(bmove.to);
    return cb - ca;
  });

  function sameColor(x: number, y: number): boolean {
    if (x === 0 || y === 0) return false;
    return (x === 1 && y === 1) || (x === 2 && y === 2);
  }
  function centralityDest(i: number): number {
    const x = i % 8,
      y = Math.floor(i / 8);
    const dx = x - 3.5,
      dy = y - 3.5;
    return -(dx * dx + dy * dy);
  }
}

function pvs(
  pos: Position,
  depth: number,
  alpha: number,
  beta: number,
  tt: TranspositionTable
): number {
  const ttHit = tt.get(pos);
  if (ttHit && ttHit.depth >= depth) {
    if (ttHit.bound === "EXACT") return ttHit.value;
    if (ttHit.bound === "LOWER" && ttHit.value > alpha) alpha = ttHit.value;
    else if (ttHit.bound === "UPPER" && ttHit.value < beta) beta = ttHit.value;
    if (alpha >= beta) return ttHit.value;
  }

  if (depth === 0) {
    const evalv = evaluate(pos);
    return evalv;
  }

  const moves = pos.generateMoves();
  if (moves.length === 0) {
    // No legal moves in LoA should be rare; treat as drawish.
    return 0;
  }

  let bestVal = -Infinity;
  let bestMove: Move | undefined = ttHit?.best;
  const ordered = orderMoves(pos, moves, bestMove);

  let first = true;
  let bound: Bound = "UPPER";
  for (const m of ordered) {
    const child = pos.apply(m);
    let score: number;
    if (first) {
      score = -pvs(child, depth - 1, -beta, -alpha, tt);
      first = false;
    } else {
      // null window search
      score = -pvs(child, depth - 1, -alpha - 1, -alpha, tt);
      if (score > alpha && score < beta) {
        // re-search
        score = -pvs(child, depth - 1, -beta, -alpha, tt);
      }
    }
    if (score > bestVal) {
      bestVal = score;
      bestMove = m;
      if (score > alpha) {
        alpha = score;
        bound = "EXACT";
        if (alpha >= beta) {
          bound = "LOWER";
          break;
        }
      }
    }
  }

  tt.put(pos, { depth, value: bestVal, bound, best: bestMove });
  return bestVal;
}

export function searchBest(pos: Position, opts: SearchOptions = {}): { move: Move; score: number } {
  const depth = opts.depth ?? 5;
  const tt = new TranspositionTable(opts.ttSize ?? 1 << 16);

  let best: Move | null = null;
  let bestScore = -Infinity;

  // Iterative deepening for better TT move ordering
  for (let d = 1; d <= depth; d++) {
    const moves = pos.generateMoves();
    if (moves.length === 0) break;
    let localBest = moves[0];
    let localBestScore = -Infinity;

    const ordered = orderMoves(pos, moves, best ?? (undefined as any));
    for (const m of ordered) {
      const child = pos.apply(m);
      const score = -pvs(child, d - 1, -Infinity, Infinity, tt);
      if (score > localBestScore) {
        localBestScore = score;
        localBest = m;
      }
    }
    best = localBest;
    bestScore = localBestScore;
    // console.log(`info depth ${d} pv ${moveToStr(best)} score ${bestScore}`);
  }

  if (!best) {
    // fallback: any move
    const ms = pos.generateMoves();
    best = ms[0];
    bestScore = 0;
  }
  return { move: best, score: bestScore };
}
