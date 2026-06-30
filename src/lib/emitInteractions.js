export const EMIT_INTERACTIONS_HOST_SOURCE = "replay-pilot-emit-interactions-host";
export const EMIT_INTERACTIONS_SOURCE = "emit-interactions";
export const EMIT_INTERACTIONS_PROTOCOL_VERSION = 1;

export function createEmitInteractionsSession(projectId, scenarioId) {
  return {
    state: "active",
    sessionId: crypto.randomUUID(),
    projectId,
    scenarioId,
    bridgeReady: false,
    bridgePaused: false,
    interactions: []
  };
}

export function isEmitInteractionsMessage(data) {
  return data?.source === EMIT_INTERACTIONS_SOURCE
    && data?.version === EMIT_INTERACTIONS_PROTOCOL_VERSION;
}
