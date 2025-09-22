import { PVModel } from "../types";

/**
 * This module could aggregate different PV providers (ONNX, TFJS, etc.)
 * For now we export the ONNX implementation and a Null model.
 */

export class NullPV implements PVModel {
  async predict(state: Uint8Array): Promise<{ policy: Map<string, number>; value: number }> {
    // Uniform policy, zero value.
    return { policy: new Map<string, number>(), value: 0 };
  }
}

export * from "./onnxModel";
