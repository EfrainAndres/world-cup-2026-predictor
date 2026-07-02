import type { PredictionTelemetryPayload } from "./prediction-telemetry.js";

export interface PredictionTelemetrySink {
  emit(event: string, payload: PredictionTelemetryPayload): void;
}

export const nullTelemetrySink: PredictionTelemetrySink = {
  emit() {},
};

export function createMemoryTelemetrySink(): PredictionTelemetrySink & {
  readonly events: ReadonlyArray<{ event: string; payload: PredictionTelemetryPayload }>;
} {
  const events: Array<{ event: string; payload: PredictionTelemetryPayload }> = [];
  return {
    get events() {
      return events as ReadonlyArray<{ event: string; payload: PredictionTelemetryPayload }>;
    },
    emit(event: string, payload: PredictionTelemetryPayload) {
      events.push({ event, payload });
    },
  };
}

/** Server-only: writes one structured JSON line to stdout. Never import in client code. */
export function createStructuredLogTelemetrySink(): PredictionTelemetrySink {
  return {
    emit(event: string, payload: PredictionTelemetryPayload) {
      try {
        console.info(JSON.stringify({ event, ...payload }));
      } catch {
        // Never fail prediction on telemetry errors.
      }
    },
  };
}
