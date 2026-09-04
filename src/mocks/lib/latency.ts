/**
 * Deterministic mock latency presets (MASTER_FRONTEND_PLAN §10 "Latency").
 * No randomness — fixed ms so demos are reproducible.
 */
export function latencyNormalRead(): number {
  return 180
}

export function latencyMutation(): number {
  return 320
}

/** Fixed delay for a controlled "slow" scenario. */
export function latencySlow(): number {
  return 1500
}
