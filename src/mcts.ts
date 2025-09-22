import { MctsOptions, Move, Player } from "./types";
import { Position } from "./loa";
import { evaluate } from "./eval";

interface Node {
  N: number;
  W: number;
  Q: number;
  P: number; // prior
  move?: Move;
  children?: Node[];
  expanded: boolean;
  toMove: Player;
}

const EPS = 1e-9;

export class MCTS {
  private cPuct: number;
  private temperature: number;
  constructor(private opts: MctsOptions) {
    this.cPuct = opts.cPuct ?? 1.4;
    this.temperature = Math.max(0.0, opts.temperature ?? 1.0);
  }

  run(
    rootPos: Position,
    policyProvider?: (pos: Position, moves: Move[]) => Promise<Map<string, number>>,
    valueProvider?: (pos: Position) => Promise<number>
  ): Move {
    const root: Node = { N: 0, W: 0, Q: 0, P: 1.0, expanded: false, toMove: rootPos.toMove };
    const moves0 = rootPos.generateMoves();
    const priors = new Map<string, number>();
    if (policyProvider) {
      // Fill priors asynchronously
      // Note: we run synchronously via await in an async wrapper; here we do a uniform fallback.
    }
    if (priors.size === 0) {
      const uni = 1 / Math.max(1, moves0.length);
      for (const m of moves0) priors.set(JSON.stringify(m), uni);
    }

    root.children = moves0.map((m) => ({
      N: 0,
      W: 0,
      Q: 0,
      P: priors.get(JSON.stringify(m)) ?? 1 / moves0.length,
      move: m,
      expanded: false,
      toMove: rootPos.toMove,
    }));

    for (let s = 0; s < this.opts.sims; s++) {
      this.simulate(rootPos, root);
    }

    // Pick move by visit count (temperature handling).
    const visits = root.children!.map((c) => c.N);
    let probs = visits.map((v) => Math.pow(v, 1 / Math.max(EPS, this.temperature)));
    const sum = probs.reduce((a, b) => a + b, 0);
    probs = probs.map((p) => p / (sum + EPS));
    let bestIdx = 0,
      bestVal = -1;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > bestVal) {
        bestVal = probs[i];
        bestIdx = i;
      }
    }
    return root.children![bestIdx].move!;
  }

  private simulate(pos: Position, node: Node): number {
    if (!node.expanded) {
      // Leaf evaluation
      const v = this.leafValue(pos);
      node.expanded = true;
      // Expand children
      const moves = pos.generateMoves();
      const uni = 1 / Math.max(1, moves.length);
      node.children = moves.map((m) => ({
        N: 0,
        W: 0,
        Q: 0,
        P: uni,
        move: m,
        expanded: false,
        toMove: pos.toMove,
      }));
      // Back up
      node.N += 1;
      node.W += v;
      node.Q = node.W / node.N;
      return v;
    }

    if (!node.children || node.children.length === 0) {
      // Terminal
      const v = this.leafValue(pos);
      node.N += 1;
      node.W += v;
      node.Q = node.W / node.N;
      return v;
    }

    // Select
    const parentVisits = Math.max(1, node.N);
    let best: Node | null = null;
    let bestScore = -Infinity;
    for (const c of node.children) {
      const u = (this.cPuct * c.P * Math.sqrt(parentVisits)) / (1 + c.N);
      const s = c.Q + u;
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }

    // Recurse
    const chosen = best!;
    const nextPos = pos.apply(chosen.move!);
    const value = -this.simulate(nextPos, chosen);

    // Update this node
    node.N += 1;
    node.W += value;
    node.Q = node.W / node.N;

    return value;
  }

  private leafValue(pos: Position): number {
    // If you have a value network, call it here; otherwise use a scaled heuristic.
    // Scale heuristic to [-1, 1] via tanh on a soft divisor.
    const raw = evaluate(pos);
    return Math.tanh(raw / 1000);
  }
}
