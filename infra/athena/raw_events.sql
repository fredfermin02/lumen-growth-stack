-- Phase 3 — Lumen raw events table + dedup view
--
-- The base TABLE is created via the SAM template (Glue::Table resource in infra/template.yaml).
-- This SQL is for the VIEW only — run via `aws athena start-query-execution` after the stack deploys.

CREATE OR REPLACE VIEW lumen_analytics.events_deduped AS
SELECT
  event_id,
  event_name,
  occurred_at,
  shop,
  user_pseudo_id,
  value,
  currency,
  payload,
  dt
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY occurred_at ASC) AS rn
  FROM lumen_analytics.raw_events
)
WHERE rn = 1;
