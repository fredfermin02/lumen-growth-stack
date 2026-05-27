-- Experiment 001 assignment table.
--
-- GrowthBook -> Settings -> Datasources -> Athena -> Experiment Assignment Table
-- Returns one row per (user_pseudo_id, variant) pair, capturing the first
-- time we observed each user exposed to experiment 001.
--
-- Tested in Athena workgroup `lumen` against `lumen_analytics.raw_events`.

SELECT
  user_pseudo_id                                       AS user_id,
  MIN(occurred_at)                                     AS timestamp,
  json_extract_scalar(payload, '$.data.experiment_id') AS experiment_id,
  json_extract_scalar(payload, '$.data.variant')       AS variation_id
FROM lumen_analytics.raw_events
WHERE
  json_extract_scalar(payload, '$.data.experiment_id') = '001'
  AND user_pseudo_id IS NOT NULL
  AND event_name = 'product_viewed'
GROUP BY
  user_pseudo_id,
  json_extract_scalar(payload, '$.data.experiment_id'),
  json_extract_scalar(payload, '$.data.variant')
