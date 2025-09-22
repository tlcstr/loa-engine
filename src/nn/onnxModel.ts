import { PVModel } from "../types";

let ort: any;
try {
  // Lazy import so the engine works even without onnxruntime installed.
  ort = require("onnxruntime-node");
} catch {
  ort = null;
}

/**
 * OnnxPV expects a policy+value model with input [1, C, 8, 8].
 * For simplicity, we do not define a fixed head layout here:
 * - If ONNX is not available or model isn't provided, returns uniform priors (empty Map) and value 0.
 * - You can plug your own mapping from moves to logits in `decodePolicy`.
 */
export class OnnxPV implements PVModel {
  private session: any | null = null;

  async load(modelPath: string): Promise<void> {
    if (!ort) {
      throw new Error("onnxruntime-node not available. Please install it to use OnnxPV.");
    }
    this.session = await ort.InferenceSession.create(modelPath);
  }

  async predict(
    state: Uint8Array,
    _toMove: 1 | 2
  ): Promise<{ policy: Map<string, number>; value: number }> {
    if (!this.session) {
      // Fallback uniform
      return { policy: new Map(), value: 0 };
    }
    // Build a simple 3-channel tensor: [black, white, toMove]
    const black = new Float32Array(64);
    const white = new Float32Array(64);
    for (let i = 0; i < 64; i++) {
      if (state[i] === 1) black[i] = 1;
      else if (state[i] === 2) white[i] = 1;
    }
    const side = new Float32Array(64).fill(_toMove === 1 ? 1 : -1);
    const input = new ort.Tensor(
      "float32",
      new Float32Array([...black, ...white, ...side]),
      [1, 3, 8, 8]
    );
    const feeds: Record<string, any> = {};
    // Heuristic: use the first input name
    const firstName = this.session.inputNames[0];
    feeds[firstName] = input;
    const out = await this.session.run(feeds);
    const outNames = this.session.outputNames;
    const valueName =
      outNames.find((n: string) => n.toLowerCase().includes("value")) ?? outNames[0];
    const policyName =
      outNames.find((n: string) => n.toLowerCase().includes("policy")) ?? outNames[0];

    const valueTensor = out[valueName];
    const policyTensor = out[policyName];
    const value = Array.isArray(valueTensor.data) ? valueTensor.data[0] : valueTensor.data[0];
    // Policy mapping is model-specific; returning empty means "uniform fallback" at MCTS side.
    const policy = new Map<string, number>();
    if (policyTensor && policyTensor.data && policyTensor.data.length) {
      // If your model emits per-move logits, decode them here.
      // As a placeholder we leave it empty so engine uses uniform over legal moves.
    }
    return { policy, value: Math.max(-1, Math.min(1, value)) };
  }
}
