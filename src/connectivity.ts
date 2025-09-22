import { Piece, Player, idx, inBoard } from "./types";

/**
 * Count number of 8-connected groups for a given player's pieces.
 */
export function countGroups(board: Uint8Array, pl: Player): number {
  const target = pl === 1 ? Piece.Black : Piece.White;
  const seen = new Uint8Array(64);
  const dirs8: Array<[number, number]> = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
  ];
  let groups = 0;

  for (let i = 0; i < 64; i++) {
    if (board[i] !== target || seen[i]) continue;
    groups++;
    // BFS
    const q: number[] = [i];
    seen[i] = 1;
    while (q.length) {
      const v = q.pop()!;
      const x = v % 8,
        y = Math.floor(v / 8);
      for (const [dx, dy] of dirs8) {
        const nx = x + dx,
          ny = y + dy;
        if (!inBoard(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (!seen[ni] && board[ni] === target) {
          seen[ni] = 1;
          q.push(ni);
        }
      }
    }
  }
  return groups;
}

/**
 * Quad score: count 2x2 windows with player's stones, weighted by count in window.
 * This is a simple density proxy used in LoA literature.
 */
export function quadScore(board: Uint8Array, pl: Player): number {
  const me = pl === 1 ? Piece.Black : Piece.White;
  let score = 0;
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      let cnt = 0;
      const i00 = y * 8 + x;
      const i10 = i00 + 1;
      const i01 = i00 + 8;
      const i11 = i01 + 1;
      if (board[i00] === me) cnt++;
      if (board[i10] === me) cnt++;
      if (board[i01] === me) cnt++;
      if (board[i11] === me) cnt++;
      // Weight: 0,1,3,6 for 0..4 occupants (convex-ish bump)
      if (cnt === 1) score += 1;
      else if (cnt === 2) score += 3;
      else if (cnt === 3) score += 6;
      else if (cnt === 4) score += 10;
    }
  }
  return score;
}

/**
 * Centralization: sum of squared distances to board center (3.5, 3.5), negated.
 * Lower distance => higher score.
 */
export function centralization(board: Uint8Array, pl: Player): number {
  const me = pl === 1 ? Piece.Black : Piece.White;
  let acc = 0;
  for (let i = 0; i < 64; i++) {
    if (board[i] !== me) continue;
    const x = i % 8,
      y = Math.floor(i / 8);
    const dx = x - 3.5,
      dy = y - 3.5;
    acc -= dx * dx + dy * dy;
  }
  return acc;
}
