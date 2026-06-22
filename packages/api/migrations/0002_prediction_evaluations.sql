-- Migration: 0002_prediction_evaluations
-- Purpose: Create immutable append-only prediction evaluation table.
-- Depends on: 0001_prediction_snapshots.sql
-- Run after 0001 against the target database.
--
-- snapshot_id references prediction_snapshots.snapshot_id with RESTRICT semantics:
-- deleting or updating a snapshot that has evaluations will be rejected.
-- Immutable history must not be silently cascade-deleted.

CREATE TABLE IF NOT EXISTS prediction_evaluations (
  evaluation_id              text        NOT NULL,
  snapshot_id                text        NOT NULL,
  fixture_id                 text        NOT NULL,
  provider_fixture_id        text,
  model_version              text        NOT NULL,
  metric_version             text        NOT NULL,
  evaluation_schema_version  text        NOT NULL,
  result_identity            text        NOT NULL,
  evaluated_at               timestamptz NOT NULL,
  actual_home_goals          integer     NOT NULL,
  actual_away_goals          integer     NOT NULL,
  actual_outcome             text        NOT NULL,
  metrics_payload            jsonb       NOT NULL,
  confidence_payload         jsonb       NOT NULL,
  provenance_payload         jsonb       NOT NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prediction_evaluations_pkey
    PRIMARY KEY (evaluation_id),

  CONSTRAINT prediction_evaluations_snapshot_fkey
    FOREIGN KEY (snapshot_id)
    REFERENCES prediction_snapshots (snapshot_id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,

  CONSTRAINT prediction_evaluations_identity_unique
    UNIQUE (snapshot_id, result_identity, metric_version),

  -- actual_outcome must be one of the three supported canonical outcomes
  CONSTRAINT prediction_evaluations_actual_outcome_check
    CHECK (actual_outcome IN ('home_win', 'draw', 'away_win')),

  -- scores are non-negative integers
  CONSTRAINT prediction_evaluations_home_goals_check
    CHECK (actual_home_goals >= 0),
  CONSTRAINT prediction_evaluations_away_goals_check
    CHECK (actual_away_goals >= 0),

  -- required string identifiers must not be empty
  CONSTRAINT prediction_evaluations_evaluation_id_nonempty
    CHECK (evaluation_id != ''),
  CONSTRAINT prediction_evaluations_fixture_id_nonempty
    CHECK (fixture_id != ''),
  CONSTRAINT prediction_evaluations_model_version_nonempty
    CHECK (model_version != ''),
  CONSTRAINT prediction_evaluations_metric_version_nonempty
    CHECK (metric_version != ''),
  CONSTRAINT prediction_evaluations_result_identity_nonempty
    CHECK (result_identity != '')
);

-- Index for snapshot-based queries (get all evaluations for a snapshot)
CREATE INDEX IF NOT EXISTS prediction_evaluations_snapshot_id_idx
  ON prediction_evaluations (snapshot_id);

-- Index for fixture-based queries (list by fixture, ordered by evaluation time)
CREATE INDEX IF NOT EXISTS prediction_evaluations_fixture_id_idx
  ON prediction_evaluations (fixture_id, evaluated_at DESC);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS prediction_evaluations_evaluated_at_idx
  ON prediction_evaluations (evaluated_at);
