import { Position } from "./loa";
import { searchBest } from "./search";
import { MCTS } from "./mcts";
import { moveToStr } from "./types";
import { fromLoaFen, fromAsciiBoard, applyAlgebraicMoves } from "./io";

function parseArgs(): Record<string, string> {
  // Accepts: --k=v  |  --k v   (values may contain spaces if quoted by the shell)
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const body = a.slice(2);
    const eq = body.indexOf("=");
    if (eq >= 0) {
      const k = body.slice(0, eq);
      const v = body.slice(eq + 1);
      args[k] = v;
    } else {
      const k = body;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[k] = next;
        i++;
      } else {
        args[k] = "true";
      }
    }
  }
  return args;
}

function buildPosition(args: Record<string, string>): Position {
  // Priority: --fen | --board | start, then optionally --moves
  let pos: Position;
  if (args["fen"] && args["fen"] !== "true") {
    pos = fromLoaFen(args["fen"]);
  } else if (args["board"] && args["board"] !== "true") {
    const side = (args["to"] ?? "b").toLowerCase();
    const toMove = side === "w" || side === "2" ? 2 : 1;
    pos = fromAsciiBoard(args["board"], toMove as 1 | 2);
  } else {
    pos = Position.initial();
  }
  if (args["moves"] && args["moves"] !== "true") {
    pos = applyAlgebraicMoves(pos, args["moves"]);
  }
  return pos;
}

async function main() {
  const args = parseArgs();
  const engine = (args["engine"] ?? "ab").toLowerCase(); // "ab" or "mcts"
  const pos = buildPosition(args);

  if (engine === "ab") {
    const depth = Number(args["depth"] ?? 5);
    const { move, score } = searchBest(pos, { depth });
    console.log(`bestmove ${moveToStr(move)} score ${score.toFixed(1)} (AB depth ${depth})`);
  } else {
    const sims = Number(args["sims"] ?? 1000);
    const mcts = new MCTS({ sims, cPuct: 1.4, temperature: 1e-3 });
    const move = mcts.run(pos);
    console.log(`bestmove ${moveToStr(move)} (MCTS sims ${sims})`);
  }
}

main().catch((e) => {
  console.error(e?.stack ?? e?.message ?? String(e));
  process.exit(1);
});
