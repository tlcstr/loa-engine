import { Piece, Player, idx } from "./types";
import { Position } from "./loa";

function strToIdx(sq: string): number {
  if (!/^[a-h][1-8]$/i.test(sq)) throw new Error(`Bad square: ${sq}`);
  const x = sq.toLowerCase().charCodeAt(0) - 97; // a..h -> 0..7
  const y = 8 - parseInt(sq[1], 10); // rank 8..1 -> 0..7
  return y * 8 + x;
}

export function fromLoaFen(fen: string): Position {
  // FEN-like for LoA: 8 ranks top->bottom with 'b','w' and digits for empties, then side: 'b'|'w'
  // Example (initial): 1bbbbbb1/w6w/w6w/w6w/w6w/w6w/w6w/1bbbbbb1 b
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 1) throw new Error("Missing board in FEN");
  const boardStr = parts[0];
  const sideStr = parts[1] ?? "b";
  const ranks = boardStr.split("/");
  if (ranks.length !== 8) throw new Error("FEN must have 8 ranks");
  const b = new Uint8Array(64);
  for (let r = 0; r < 8; r++) {
    const row = ranks[r];
    let x = 0;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch >= "1" && ch <= "8") {
        x += parseInt(ch, 10);
      } else if (/[bwBW.]/.test(ch)) {
        if (ch === ".") {
          x++;
        } else {
          if (x >= 8) throw new Error("Rank overflow");
          b[r * 8 + x] = ch.toLowerCase() === "b" ? Piece.Black : Piece.White;
          x++;
        }
      } else {
        throw new Error(`Bad FEN char: ${ch}`);
      }
    }
    if (x !== 8) throw new Error(`Rank ${8 - r} has ${x} files (need 8)`);
  }
  const toMove: Player = /^(b|1)$/i.test(sideStr) ? 1 : 2;
  return new Position(b, toMove);
}

export function fromAsciiBoard(board8: string, toMove: Player = 1): Position {
  // Accept 8 rows top->bottom (rank 8..1), allowing 'b','w','.' and digits 1..8 (run-length empties)
  const rows = board8.trim().includes("/")
    ? board8.trim().split("/")
    : board8.trim().split(/\r?\n/);
  if (rows.length !== 8) throw new Error("ASCII must have 8 rows");
  const b = new Uint8Array(64);
  for (let r = 0; r < 8; r++) {
    const row = rows[r].trim();
    let x = 0;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch >= "1" && ch <= "8") {
        x += parseInt(ch, 10);
      } else if (ch === ".") {
        x++;
      } else if (ch === "b" || ch === "B" || ch === "w" || ch === "W") {
        if (x >= 8) throw new Error("Rank overflow");
        b[r * 8 + x] = ch.toLowerCase() === "b" ? Piece.Black : Piece.White;
        x++;
      } else {
        throw new Error(`Bad char '${ch}' at row ${r}, col ${i}`);
      }
    }
    if (x !== 8) throw new Error(`Row ${r} has ${x} files (need 8)`);
  }
  return new Position(b, toMove);
}

export function applyAlgebraicMoves(pos: Position, movesList: string): Position {
  // Moves like: "b1-b7 a2-c2" or "b1->b7". Validates against legal generator.
  let cur = pos;
  const tokens = movesList.split(/[\s,]+/).filter(Boolean);
  for (const t of tokens) {
    const m = t.replace("->", "-");
    const mMatch = /^([a-h][1-8])-([a-h][1-8])$/i.exec(m);
    if (!mMatch) throw new Error(`Bad move token: ${t}`);
    const from = strToIdx(mMatch[1]);
    const to = strToIdx(mMatch[2]);
    const legal = cur.generateMoves().find((mm) => mm.from === from && mm.to === to);
    if (!legal) throw new Error(`Illegal move in sequence: ${t}`);
    cur = cur.apply({ from, to });
  }
  return cur;
}
