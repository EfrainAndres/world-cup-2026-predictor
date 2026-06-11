# API Next Steps

Phase 5.0 creates pure API handlers. Future API work should add transport carefully.

## Recommended Next Phase

Phase 5.1 - API Transport Layer.

## Next Work

1. Decide whether the transport should be Next.js route handlers or a separate service.
2. Add HTTP request and response adapters around the pure handlers.
3. Preserve current validation errors and warnings in API responses.
4. Add contract tests for HTTP response shapes.
5. Add versioning metadata to every public response.
6. Keep model logic inside `packages/model`.
7. Keep API handlers thin.

No public endpoint should present foundation replay outputs as final predictive accuracy.
