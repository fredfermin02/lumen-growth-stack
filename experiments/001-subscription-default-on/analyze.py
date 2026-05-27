#!/usr/bin/env python3
"""
Direct analysis of experiment 001 against Athena, mirroring what GrowthBook
would compute. Cross-validation / standalone analysis for portfolio purposes.

Outputs:
  - Per-arm counts (assignments, purchases, subscription purchases, revenue)
  - SRM chi-square test (variant split sanity)
  - Primary: two-proportion z-test on subscriber rate (subs/purchases)
  - Guardrail: one-sided z-test on conversion rate (drops)
  - Secondary: Welch's t-test on revenue per visitor

Usage:
  pip install -r requirements.txt   # scipy, numpy, boto3 already installed
  python analyze.py --experiment-id 001
"""

from __future__ import annotations

import argparse
import math
import sys
import time
from dataclasses import dataclass
from typing import Optional

import boto3
from scipy import stats

REGION = "us-east-1"
WORKGROUP = "lumen"
DATABASE = "lumen_analytics"

athena = boto3.client("athena", region_name=REGION)


# ---------------------------------------------------------------------------
# Athena query helper
# ---------------------------------------------------------------------------

def run_query(sql: str) -> list[dict]:
    """Run a SQL query against Athena and return result rows as dicts."""
    resp = athena.start_query_execution(
        QueryString=sql,
        WorkGroup=WORKGROUP,
        QueryExecutionContext={"Database": DATABASE},
    )
    qid = resp["QueryExecutionId"]

    while True:
        info = athena.get_query_execution(QueryExecutionId=qid)
        state = info["QueryExecution"]["Status"]["State"]
        if state == "SUCCEEDED":
            break
        if state in ("FAILED", "CANCELLED"):
            reason = info["QueryExecution"]["Status"].get("StateChangeReason", "")
            raise RuntimeError(f"Athena query {state}: {reason}\nSQL: {sql}")
        time.sleep(1.5)

    results = athena.get_query_results(QueryExecutionId=qid)
    cols = [c["Label"] for c in results["ResultSet"]["ResultSetMetadata"]["ColumnInfo"]]
    rows = []
    for row in results["ResultSet"]["Rows"][1:]:  # skip header row
        vals = [cell.get("VarCharValue") for cell in row["Data"]]
        rows.append(dict(zip(cols, vals)))
    return rows


# ---------------------------------------------------------------------------
# Counts per arm
# ---------------------------------------------------------------------------

@dataclass
class ArmCounts:
    variant: str
    visitors: int
    purchases: int
    subscription_purchases: int
    revenue: float


def fetch_arm_counts(experiment_id: str) -> dict[str, ArmCounts]:
    """One round-trip query that gives everything per arm."""
    sql = f"""
    WITH events AS (
      SELECT
        json_extract_scalar(payload, '$.data.experiment_id') AS experiment_id,
        json_extract_scalar(payload, '$.data.variant')       AS variant,
        json_extract_scalar(payload, '$.data.is_subscription') AS is_subscription,
        user_pseudo_id,
        event_name,
        value
      FROM lumen_analytics.raw_events
      WHERE json_extract_scalar(payload, '$.data.experiment_id') = '{experiment_id}'
        AND user_pseudo_id IS NOT NULL
    ),
    exposures AS (
      SELECT
        variant,
        COUNT(DISTINCT user_pseudo_id) AS visitors
      FROM events
      WHERE event_name = 'product_viewed'
      GROUP BY variant
    ),
    purchases AS (
      SELECT
        variant,
        COUNT(*)            AS purchase_count,
        SUM(value)          AS revenue,
        SUM(CASE WHEN is_subscription = 'true' THEN 1 ELSE 0 END) AS sub_count
      FROM events
      WHERE event_name = 'checkout_completed'
      GROUP BY variant
    )
    SELECT
      e.variant         AS variant,
      e.visitors        AS visitors,
      COALESCE(p.purchase_count, 0) AS purchases,
      COALESCE(p.sub_count, 0)      AS subscription_purchases,
      COALESCE(p.revenue, 0.0)      AS revenue
    FROM exposures e
    LEFT JOIN purchases p ON e.variant = p.variant
    ORDER BY e.variant
    """
    rows = run_query(sql)
    out: dict[str, ArmCounts] = {}
    for r in rows:
        v = r["variant"]
        if v not in ("control", "treatment"):
            continue
        out[v] = ArmCounts(
            variant=v,
            visitors=int(r["visitors"]),
            purchases=int(r["purchases"]),
            subscription_purchases=int(r["subscription_purchases"]),
            revenue=float(r["revenue"]),
        )
    return out


def fetch_purchase_values(experiment_id: str) -> dict[str, list[float]]:
    """Per-user total revenue per arm. Used for Welch's t-test on RPV."""
    sql = f"""
    SELECT
      json_extract_scalar(payload, '$.data.variant') AS variant,
      user_pseudo_id,
      SUM(value)                                     AS total_revenue
    FROM lumen_analytics.raw_events
    WHERE json_extract_scalar(payload, '$.data.experiment_id') = '{experiment_id}'
      AND event_name = 'checkout_completed'
      AND user_pseudo_id IS NOT NULL
    GROUP BY 1, 2
    """
    rows = run_query(sql)
    out: dict[str, list[float]] = {"control": [], "treatment": []}
    for r in rows:
        v = r["variant"]
        if v in out:
            out[v].append(float(r["total_revenue"]))
    return out


# ---------------------------------------------------------------------------
# Statistical tests
# ---------------------------------------------------------------------------

def two_proportion_z_test(
    successes_a: int, n_a: int, successes_b: int, n_b: int
) -> tuple[float, float, float, float]:
    """Two-sided z-test for difference in proportions.

    Returns: (p_a, p_b, z, p_value)
    """
    p_a = successes_a / n_a if n_a > 0 else 0
    p_b = successes_b / n_b if n_b > 0 else 0
    p_pool = (successes_a + successes_b) / (n_a + n_b)
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / n_a + 1 / n_b))
    z = (p_b - p_a) / se if se > 0 else 0.0
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))
    return p_a, p_b, z, p_value


def diff_in_proportions_ci(
    successes_a: int, n_a: int, successes_b: int, n_b: int, alpha: float = 0.05
) -> tuple[float, float, float]:
    """95% Wald CI on (p_b - p_a). Returns (point_estimate, lo, hi)."""
    p_a = successes_a / n_a if n_a > 0 else 0
    p_b = successes_b / n_b if n_b > 0 else 0
    diff = p_b - p_a
    se = math.sqrt(p_a * (1 - p_a) / n_a + p_b * (1 - p_b) / n_b) if n_a and n_b else 0.0
    z = stats.norm.ppf(1 - alpha / 2)
    return diff, diff - z * se, diff + z * se


def srm_chi_square(n_a: int, n_b: int, expected_ratio: float = 0.5) -> tuple[float, float]:
    """Chi-square goodness-of-fit for 50/50 split.

    Returns: (chi2, p_value)
    """
    total = n_a + n_b
    if total == 0:
        return 0.0, 1.0
    expected_a = total * expected_ratio
    expected_b = total * (1 - expected_ratio)
    chi2 = (n_a - expected_a) ** 2 / expected_a + (n_b - expected_b) ** 2 / expected_b
    p_value = 1 - stats.chi2.cdf(chi2, df=1)
    return chi2, p_value


def welch_t(values_a: list[float], values_b: list[float]) -> tuple[float, float, float, float]:
    """Welch's t-test on two unequal-variance samples.

    Returns: (mean_a, mean_b, t, p_value)
    """
    if not values_a or not values_b:
        return 0.0, 0.0, 0.0, 1.0
    t, p = stats.ttest_ind(values_a, values_b, equal_var=False)
    return sum(values_a) / len(values_a), sum(values_b) / len(values_b), float(t), float(p)


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def format_pct(x: float, decimals: int = 2) -> str:
    return f"{x * 100:.{decimals}f}%"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment-id", default="001")
    args = parser.parse_args()
    exp_id = args.experiment_id

    print(f"→ Querying Athena for experiment {exp_id}...")
    arms = fetch_arm_counts(exp_id)
    if "control" not in arms or "treatment" not in arms:
        print("✗ Did not find both arms in the data. Are events flowing?")
        return 1

    c = arms["control"]
    t = arms["treatment"]

    print()
    print("Per-arm counts")
    print("==============")
    print(f"  Control    visitors={c.visitors:>6}  purchases={c.purchases:>5}  subs={c.subscription_purchases:>5}  revenue=${c.revenue:,.2f}")
    print(f"  Treatment  visitors={t.visitors:>6}  purchases={t.purchases:>5}  subs={t.subscription_purchases:>5}  revenue=${t.revenue:,.2f}")
    print()

    # --- SRM check
    chi2, srm_p = srm_chi_square(c.visitors, t.visitors)
    print("SRM check (chi-square on 50/50 visitor split)")
    print("=============================================")
    print(f"  chi-square = {chi2:.4f}    p = {srm_p:.4f}")
    if srm_p < 0.001:
        print("  ✗ SRM violated (p < 0.001). Variant split is broken. Results invalid.")
    else:
        print("  ✓ SRM check passes")
    print()

    # --- Primary metric: subscriber rate
    p_c, p_t, z_sub, p_sub = two_proportion_z_test(
        c.subscription_purchases, c.purchases,
        t.subscription_purchases, t.purchases,
    )
    diff_sub, lo_sub, hi_sub = diff_in_proportions_ci(
        c.subscription_purchases, c.purchases,
        t.subscription_purchases, t.purchases,
    )
    print("Primary metric — subscriber rate (subs / purchases)")
    print("===================================================")
    print(f"  Control    {format_pct(p_c)}  ({c.subscription_purchases}/{c.purchases})")
    print(f"  Treatment  {format_pct(p_t)}  ({t.subscription_purchases}/{t.purchases})")
    print(f"  Lift       {format_pct(diff_sub):>7}  [95% CI: {format_pct(lo_sub)} to {format_pct(hi_sub)}]")
    print(f"  z = {z_sub:.3f}    p = {p_sub:.4f}")
    if p_sub < 0.05 and diff_sub > 0:
        print("  ✓ Significant positive lift")
    elif p_sub < 0.05 and diff_sub < 0:
        print("  ✗ Significant negative result")
    else:
        print("  · Not significant at α=0.05 (CI includes zero)")
    print()

    # --- Guardrail: conversion rate
    p_c_conv, p_t_conv, z_conv, p_conv = two_proportion_z_test(
        c.purchases, c.visitors, t.purchases, t.visitors,
    )
    diff_conv, lo_conv, hi_conv = diff_in_proportions_ci(
        c.purchases, c.visitors, t.purchases, t.visitors,
    )
    relative_drop = (p_t_conv - p_c_conv) / p_c_conv if p_c_conv > 0 else 0
    print("Guardrail metric — conversion rate (purchases / visitors)")
    print("=========================================================")
    print(f"  Control    {format_pct(p_c_conv)}  ({c.purchases}/{c.visitors})")
    print(f"  Treatment  {format_pct(p_t_conv)}  ({t.purchases}/{t.visitors})")
    print(f"  Δ          {format_pct(diff_conv):>7}  [95% CI: {format_pct(lo_conv)} to {format_pct(hi_conv)}]")
    print(f"  Relative   {relative_drop * 100:+.2f}%")
    print(f"  p = {p_conv:.4f} (two-sided)")
    if relative_drop < -0.05 and p_conv < 0.05:
        print("  ✗ Guardrail violated (≥5% relative drop, significant)")
    else:
        print("  ✓ Guardrail not violated")
    print()

    # --- Secondary: revenue per visitor
    rpv_c = c.revenue / c.visitors if c.visitors else 0
    rpv_t = t.revenue / t.visitors if t.visitors else 0
    purchase_values = fetch_purchase_values(exp_id)
    # Zero-fill non-purchasers so the t-test is per-visitor RPV, not per-purchaser
    full_values_c = purchase_values["control"] + [0.0] * (c.visitors - len(purchase_values["control"]))
    full_values_t = purchase_values["treatment"] + [0.0] * (t.visitors - len(purchase_values["treatment"]))
    _, _, t_stat, p_rpv = welch_t(full_values_c, full_values_t)
    print("Secondary metric — revenue per visitor")
    print("======================================")
    print(f"  Control    ${rpv_c:.4f}")
    print(f"  Treatment  ${rpv_t:.4f}")
    print(f"  Lift       ${rpv_t - rpv_c:+.4f}")
    print(f"  Welch's t = {t_stat:.3f}    p = {p_rpv:.4f}")
    print()

    # --- Verdict per pre-reg
    ship = (p_sub < 0.05 and diff_sub > 0) and not (relative_drop < -0.05 and p_conv < 0.05)
    print("Decision (per pre-registration)")
    print("===============================")
    if ship:
        print("  → SHIP treatment")
    elif p_sub < 0.05 and diff_sub > 0:
        print("  → ESCALATE: primary positive but guardrail violated. Judgment call.")
    else:
        print("  → DO NOT SHIP: primary metric did not significantly increase at the pre-registered sample size.")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
