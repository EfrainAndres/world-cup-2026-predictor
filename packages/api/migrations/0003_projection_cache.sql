-- Migration: 0003_projection_cache
-- Purpose: Mutable operational cache for generated group projections.
-- No FK to immutable history tables — cache rows are replaceable operational data.
-- Unlike prediction_snapshots and prediction_evaluations, rows here may be upserted and deleted.

CREATE TABLE IF NOT EXISTS projection_cache (
  cache_key                        text        NOT NULL,
  group_code                       text        NOT NULL,
  timezone                         text        NOT NULL,
  projection_payload               jsonb       NOT NULL,
  input_fingerprint                text        NOT NULL,
  model_version                    text        NOT NULL,
  formula_version                  text        NOT NULL,
  projection_cache_schema_version  text        NOT NULL,
  generated_at                     timestamptz NOT NULL,
  expires_at                       timestamptz NOT NULL,
  updated_at                       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT projection_cache_pkey PRIMARY KEY (cache_key),

  -- Natural key: one cache entry per group+timezone combination.
  CONSTRAINT projection_cache_natural_key_unique UNIQUE (group_code, timezone),

  -- group_code must be a valid WC2026 group letter.
  CONSTRAINT projection_cache_group_code_check
    CHECK (group_code IN ('A','B','C','D','E','F','G','H','I','J','K','L')),

  -- Non-empty string constraints.
  CONSTRAINT projection_cache_cache_key_nonempty         CHECK (cache_key != ''),
  CONSTRAINT projection_cache_timezone_nonempty          CHECK (timezone != ''),
  CONSTRAINT projection_cache_input_fingerprint_nonempty CHECK (input_fingerprint != ''),
  CONSTRAINT projection_cache_model_version_nonempty     CHECK (model_version != ''),
  CONSTRAINT projection_cache_formula_version_nonempty   CHECK (formula_version != ''),
  CONSTRAINT projection_cache_schema_version_nonempty    CHECK (projection_cache_schema_version != ''),

  -- Expiry must be strictly after generation time.
  CONSTRAINT projection_cache_expiry_after_generated CHECK (expires_at > generated_at)
);

-- Index for expiry-based cleanup queries.
CREATE INDEX IF NOT EXISTS projection_cache_expires_at_idx
  ON projection_cache (expires_at);

-- Index for recency-ordered maintenance queries.
CREATE INDEX IF NOT EXISTS projection_cache_updated_at_idx
  ON projection_cache (updated_at);

-- Index for fingerprint-based staleness queries.
CREATE INDEX IF NOT EXISTS projection_cache_fingerprint_idx
  ON projection_cache (input_fingerprint);
