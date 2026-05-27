-- Metric: any purchase (for conversion rate guardrail + revenue per visitor).
--
-- GrowthBook expects one row per metric observation. For a count/binary metric
-- (purchased? yes/no) we emit one row per `checkout_completed` event with
-- value=1. For a continuous metric (revenue) we emit value = order revenue.
-- GrowthBook handles aggregation at the user level.
--
-- In GrowthBook UI:
--   Metric Type: Count (for conversion rate) — gives proportion = users with >=1 / total
--   Metric Type: Revenue (for RPV) — averages value over assigned users

SELECT
  user_pseudo_id AS user_id,
  occurred_at    AS timestamp,
  value          AS value
FROM lumen_analytics.raw_events
WHERE
  event_name = 'checkout_completed'
  AND json_extract_scalar(payload, '$.data.experiment_id') = '001'
  AND user_pseudo_id IS NOT NULL
