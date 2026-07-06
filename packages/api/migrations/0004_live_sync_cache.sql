-- Migration: 0004_live_sync_cache
-- Purpose: Mutable operational last-known-good cache for synchronized live match data.
-- No FK to immutable history tables — cache rows are replaceable operational data.
-- This cache prevents serverless cold starts from showing false-empty match states
-- when the external provider temporarily returns degraded or empty payloads.

CREATE TABLE IF NOT EXISTS live_sync_cache (
  cache_key       text        NOT NULL,
  payload         jsonb       NOT NULL,
  provider        text        NOT NULL,
  synced_at       timestamptz NOT NULL,
  expires_at      timestamptz NOT NULL,
  schema_version  text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT live_sync_cache_pkey PRIMARY KEY (cache_key),

  CONSTRAINT live_sync_cache_cache_key_nonempty      CHECK (cache_key != ''),
  CONSTRAINT live_sync_cache_provider_nonempty       CHECK (provider != ''),
  CONSTRAINT live_sync_cache_schema_version_nonempty CHECK (schema_version != ''),
  CONSTRAINT live_sync_cache_expiry_after_synced     CHECK (expires_at > synced_at)
);

CREATE INDEX IF NOT EXISTS live_sync_cache_expires_at_idx
  ON live_sync_cache (expires_at);

CREATE INDEX IF NOT EXISTS live_sync_cache_updated_at_idx
  ON live_sync_cache (updated_at);
