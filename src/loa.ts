import { DIRS, Piece, Player, Move, idx, inBoard } from "./types";

/**
 * Position encapsulates LoA board state and move generation.
 * Board encoding: Uint8Array[64], 0 = empty, 1 = black, 2 = white.
 */
export class Position {
  board: Uint8Array;
  toMove: Player;

  constructor(board?: Uint8Array, toMove: Player = 1) {
    this.board = board ? new Uint8Array(board) : new Uint8Array(64);
    this.toMove = toMove;
  }

  static initial(): Position {
    const b = new Uint8Array(64);
    // Standard LoA start:
    // Black on ranks 1 and 8 files b..g (top y=0 and bottom y=7, x=1..6)
    for (let x = 1; x <= 6; x++) {
      b[idx(x, 0)] = Piece.Black;
      b[idx(x, 7)] = Piece.Black;
    }
    // White on files a and h ranks 2..7 (left x=0 and right x=7, y=1..6)
    for (let y = 1; y <= 6; y++) {
      b[idx(0, y)] = Piece.White;
      b[idx(7, y)] = Piece.White;
    }
    return new Position(b, 1);
  }

  clone(): Position {
    return new Position(this.board, this.toMove);
  }

  pieceAt(i: number): Piece {
    return this.board[i];
  }

  isOwn(p: Piece): boolean {
    return (this.toMove === 1 && p === Piece.Black) || (this.toMove === 2 && p === Piece.White);
  }

  opponent(): Player {
    return this.toMove === 1 ? 2 : 1;
  }

  /**
   * Count all pieces (both colors) on the full line in direction (dx,dy) through origin (x,y), inclusive.
   */
  private countLinePieces(x: number, y: number, dx: number, dy: number): number {
    let cnt = 1; // include origin
    // forward
    let fx = x + dx,
      fy = y + dy;
    while (inBoard(fx, fy)) {
      if (this.board[idx(fx, fy)] !== Piece.Empty) cnt++;
      fx += dx;
      fy += dy;
    }
    // backward
    let bx = x - dx,
      by = y - dy;
    while (inBoard(bx, by)) {
      if (this.board[idx(bx, by)] !== Piece.Empty) cnt++;
      bx -= dx;
      by -= dy;
    }
    return cnt;
  }

  /**
   * Check path from (x,y) to (tx,ty) along (dx,dy) excluding target.
   * Own pieces can be jumped over. Opponent pieces cannot be jumped over.
   */
  private pathLegal(x: number, y: number, tx: number, ty: number, dx: number, dy: number): boolean {
    let cx = x + dx,
      cy = y + dy;
    while (!(cx === tx && cy === ty)) {
      const p = this.board[idx(cx, cy)];
      if (p !== Piece.Empty) {
        // If an opponent piece is on the path before target, it's illegal.
        const isOpp =
          (this.toMove === 1 && p === Piece.White) || (this.toMove === 2 && p === Piece.Black);
        if (isOpp) return false;
        // Own piece can be jumped.
      }
      cx += dx;
      cy += dy;
    }
    return true;
  }

  generateMoves(): Move[] {
    const moves: Move[] = [];
    for (let i = 0; i < 64; i++) {
      const p = this.board[i];
      if (p === Piece.Empty) continue;
      const isOwn = this.isOwn(p);
      if (!isOwn) continue;

      const x = i % 8,
        y = Math.floor(i / 8);
      for (const [dx, dy] of DIRS) {
        const dist = this.countLinePieces(x, y, dx, dy);
        const tx = x + dx * dist,
          ty = y + dy * dist;
        if (!inBoard(tx, ty)) continue;
        const toI = idx(tx, ty);
        const target = this.board[toI];
        if (target === p) continue; // cannot land on own piece
        if (!this.pathLegal(x, y, tx, ty, dx, dy)) continue;
        moves.push({ from: i, to: toI });
      }
    }
    return moves;
  }

  /**
   * Apply a move and return the new Position (capture by landing).
   */
  apply(m: Move): Position {
    const nb = new Uint8Array(this.board);
    const mover = nb[m.from];
    nb[m.from] = Piece.Empty;
    nb[m.to] = mover; // capture by overwrite
    const next = new Position(nb, this.opponent());
    return next;
  }
}
