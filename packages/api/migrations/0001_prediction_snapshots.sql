-- Migration: 0001_prediction_snapshots
-- Purpose: Create immutable append-only prediction snapshot table.
-- Run once against the target database before enabling the PostgreSQL adapter.
--
-- content_hash uniqueness decision:
--   A unique constraint on content_hash is intentionally omitted. The content hash
--   covers prediction outputs (probabilities, scorelines) derived from model inputs.
--   Two distinct fixtures could theoretically produce the same probability distribution
--   under the same model version, and idempotency is already enforced by the unique
--   constraint on idempotency_key (which hashes the full input identity). Adding a
--   content_hash unique constraint would cause spurious conflicts on legitimate but
--   numerically identical predictions for different fixtures.
--   An index on content_hash supports fast deduplication queries without the
--   uniqueness restriction.

CREATE TABLE IF NOT EXISTS prediction_snapshots (
  snapshot_id               text        NOT NULL,
  fixture_id                text        NOT NULL,
  provider_fixture_id       text,
  snapshot_status           text        NOT NULL,
  captured_at               timestamptz NOT NULL,
  cutoff_at                 timestamptz NOT NULL,
  kickoff_at                timestamptz,
  group_code                text,
  matchday                  integer,
  home_team                 text        NOT NULL,
  away_team                 text        NOT NULL,
  model_version             text        NOT NULL,
  formula_version           text        NOT NULL,
  snapshot_schema_version   text        NOT NULL,
  idempotency_key           text        NOT NULL,
  content_hash              text        NOT NULL,
  prediction_payload        jsonb       NOT NULL,
  confidence_payload        jsonb       NOT NULL,
  provenance_payload        jsonb       NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prediction_snapshots_pkey
    PRIMARY KEY (snapshot_id),

  CONSTRAINT prediction_snapshots_idempotency_key_unique
    UNIQUE (idempotency_key),

  -- snapshot_status must be one of the two supported values
  CONSTRAINT prediction_snapshots_status_check
    CHECK (snapshot_status IN ('pre_match_locked', 'foundation_unverified')),

  -- pre_match_locked requires a kickoff_at and captured_at must precede it
  CONSTRAINT prediction_snapshots_pre_match_timing_check
    CHECK (
      snapshot_status != 'pre_match_locked'
      OR (kickoff_at IS NOT NULL AND captured_at < kickoff_at)
    ),

  -- group_code A–L when present
  CONSTRAINT prediction_snapshots_group_code_check
    CHECK (group_code IS NULL OR group_code IN ('A','B','C','D','E','F','G','H','I','J','K','L')),

  -- matchday positive when present
  CONSTRAINT prediction_snapshots_matchday_check
    CHECK (matchday IS NULL OR matchday > 0),

  -- required identifiers must not be empty
  CONSTRAINT prediction_snapshots_fixture_id_nonempty
    CHECK (fixture_id != ''),
  CONSTRAINT prediction_snapshots_home_team_nonempty
    CHECK (home_team != ''),
  CONSTRAINT prediction_snapshots_away_team_nonempty
    CHECK (away_team != ''),
  CONSTRAINT prediction_snapshots_model_version_nonempty
    CHECK (model_version != ''),
  CONSTRAINT prediction_snapshots_formula_version_nonempty
    CHECK (formula_version != ''),
  CONSTRAINT prediction_snapshots_snapshot_schema_version_nonempty
    CHECK (snapshot_schema_version != ''),
  CONSTRAINT prediction_snapshots_content_hash_nonempty
    CHECK (content_hash != '')
);

-- Index for fixture-based queries (list by fixture, ordered by capture time)
CREATE INDEX IF NOT EXISTS prediction_snapshots_fixture_id_idx
  ON prediction_snapshots (fixture_id, captured_at DESC);

-- Index for capture-time range queries
CREATE INDEX IF NOT EXISTS prediction_snapshots_captured_at_idx
  ON prediction_snapshots (captured_at);

-- Index for content deduplication queries (not unique; see comment above)
CREATE INDEX IF NOT EXISTS prediction_snapshots_content_hash_idx
  ON prediction_snapshots (content_hash);

-- Index to support group+matchday queries
CREATE INDEX IF NOT EXISTS prediction_snapshots_group_matchday_idx
  ON prediction_snapshots (group_code, matchday)
  WHERE group_code IS NOT NULL;

-- Index for optional provider fixture id lookups
CREATE INDEX IF NOT EXISTS prediction_snapshots_provider_fixture_id_idx
  ON prediction_snapshots (provider_fixture_id)
  WHERE provider_fixture_id IS NOT NULL;
