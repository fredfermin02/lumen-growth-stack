-- Metric: subscription purchase (primary metric for experiment 001).
--
-- Pre-registration defines subscriber rate as
--   (subscription purchases) / (total purchases).
-- In GrowthBook we model this as a Ratio metric:
--   numerator: rows from this query (subscription purchases)
--   denominator: rows from `purchases.sql` (all purchases)
-- GrowthBook computes the ratio per variant and runs a two-proportion z-test
-- by default for binomial metrics.

SELECT
  user_pseudo_id AS user_id,
  occurred_at    AS timestamp,
  value          AS value
FROM lumen_analytics.raw_events
WHERE
  event_name = 'checkout_completed'
  AND json_extract_scalar(payload, '$.data.experiment_id') = '001'
  AND json_extract_scalar(payload, '$.data.is_subscription') = 'true'
  AND user_pseudo_id IS NOT NULL
