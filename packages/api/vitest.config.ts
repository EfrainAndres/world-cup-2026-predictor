import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files sequentially in a single worker to prevent concurrent
    // TRUNCATE operations from deadlocking when PostgreSQL contract tests
    // (postgres-prediction-snapshot-store, postgres-prediction-evaluation-store,
    //  postgres-projection-cache-store) run in parallel and both issue
    // TRUNCATE CASCADE against the same tables.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});
