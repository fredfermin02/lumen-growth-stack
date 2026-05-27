# Experiment 001 — Results

**Status:** Analyzed and decided.
**Pre-registration:** [`preregistration.md`](preregistration.md)
**Run date:** 2026-05-26
**Decision:** Do not ship at this sample size.

## TL;DR

Subscriber-rate point estimate moved in the predicted direction (+2.54 percentage points absolute, treatment over control), but the 95% confidence interval includes zero and the result is not statistically significant. Guardrail metric (conversion rate) was not violated. The run was conducted at 20,000 simulated visitors — 1/8th of the pre-registered sample size — explicitly as a framework demonstration rather than a powered hypothesis test. The result is consistent with what the pre-reg's sample-size math predicted at this N: not enough purchases per arm to reject the null hypothesis.

## What was run

Synthetic traffic generator at [`simulate.py`](simulate.py) generated 20,000 unique visitors with the same SHA-256 variant assignment function used by the storefront. Funnel rates baked in per arm:

| Arm | Add-to-cart | Conversion | Subscription rate among converters |
|---|---:|---:|---:|
| Control | 40.0% | 2.5% | 12.0% (true) |
| Treatment | 40.0% | 2.5% | 15.0% (true) |

28,975 events were POSTed to the live Stape sGTM Data Client at `/lumen`, fanned out to the Lambda webhook, and landed in `s3://lumen-events-481180369246/raw/dt=2026-05-26/`. All 28,975 events were accepted (`HTTP 2xx`). [`analyze.py`](analyze.py) then queried Athena and ran the three pre-registered tests.

## Per-arm counts

| Arm | Visitors | Purchases | Subscription purchases | Revenue |
|---|---:|---:|---:|---:|
| Control | 10,056 | 246 | 38 | $3,492.00 |
| Treatment | 9,954 | 239 | 43 | $3,586.50 |

## SRM check (sample ratio mismatch)

Chi-square test against expected 50/50 split. Detects whether the variant assignment system is broken before we trust any other result.

```
χ² = 0.520    df = 1    p = 0.4709    → SRM check passes
```

Variant split is within tolerance. Assignment is working correctly.

## Primary metric — subscriber rate

Subscription purchases divided by total purchases per arm. Two-proportion z-test (two-sided).

| | Subscriber rate | n |
|---|---:|---:|
| Control | 15.45% | 38 / 246 |
| Treatment | 17.99% | 43 / 239 |
| **Lift (absolute)** | **+2.54 pp** | |
| 95% CI | [−4.10 pp, +9.19 pp] | |
| z, p | z = 0.751, p = 0.4526 | |

**Verdict:** not significant at α = 0.05. The confidence interval crosses zero. The point estimate is in the predicted direction but we cannot rule out a null effect at this sample size.

## Guardrail metric — conversion rate

Total purchases divided by exposed visitors per arm. Two-proportion z-test. Pre-registered guardrail: must not drop by more than 5% relative.

| | Conversion rate | n |
|---|---:|---:|
| Control | 2.45% | 246 / 10,056 |
| Treatment | 2.40% | 239 / 9,954 |
| **Relative change** | **−1.85%** | |
| p (two-sided) | 0.8351 | |

**Verdict:** guardrail not violated. The relative change is well within the 5% tolerance and not statistically distinguishable from zero.

## Secondary metric — revenue per visitor (RPV)

Per-visitor revenue (zero-filled for non-purchasers). Welch's t-test on the two unequal-variance distributions.

| | RPV |
|---|---:|
| Control | $0.3473 |
| Treatment | $0.3603 |
| **Lift** | **+$0.0131** |
| t, p | t = −0.262, p = 0.7931 |

**Verdict:** noisy and not significant. Reported for completeness; not the basis of the ship decision per pre-reg.

## Decision per pre-registration

The pre-reg's ship rule:

> Ship treatment if: primary metric significantly increases (p < 0.05, two-sided) AND guardrail is not violated.

Primary did not significantly increase. Therefore: **do not ship treatment** at this sample size.

## Why the result is not significant — and what's needed to make it so

The pre-registration's sample-size calculation projected ~2,030 purchases per arm to detect a +3 pp effect on a 12% baseline at α = 0.05, power = 0.80. At a 2.5% conversion rate that's ~80,000 visitors per arm, ~160,000 total.

We ran 20,000 total visitors — 1/8 of the powered target. The implied detectable effect at 20K is much larger than +3 pp (post hoc power calculation: ~20% power for a +3 pp lift). A +2.54 pp observed lift with this sample size has too much sampling noise to be distinguishable from zero.

This was an intentional tradeoff documented before the run: the goal of this exercise is to demonstrate the **framework end-to-end** (assignment → events → warehouse → analysis → decision) on real infrastructure, not to actually power the test. Running 160K visits would have required either more time at Stape's free-tier rate or pushing events past Stape directly into the Lambda — neither was on the critical path.

A real Lumen team with daily traffic would let the test run for whatever calendar duration accumulates 2,030 purchases per arm before looking, then make the ship call.

## Reproducibility

Anyone with read access to the events bucket can re-run the analysis:

```bash
cd experiments/001-subscription-default-on
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt scipy numpy boto3
python analyze.py
```

The simulator is deterministic for a given `--seed`. To recreate this exact dataset:

```bash
python simulate.py --n 20000 --seed 20260526 --concurrency 30
```

## What this proves

- ✅ The full pipeline — variant assignment, cookie bridge, pixel → Stape → Lambda → S3 → Athena — works end-to-end on realistic traffic volume.
- ✅ The SRM check is in place and passes (assignment isn't biased).
- ✅ The guardrail mechanism works (would catch a treatment-induced conversion-rate drop).
- ✅ The pre-registered ship rule was followed exactly: under-powered run produced an inconclusive primary, and per the rule we don't ship.
- ✅ The 95% CI on the primary metric is reported alongside the p-value, not just the p-value.

## What this does *not* prove

- ❌ Whether the +3 pp effect actually exists in the population. With 20K visitors and 2.5% conversion, no honest analysis can answer that. We knew this going in. It's not a finding; it's a sample-size limitation.

## Deviations log

None. The plan was followed exactly as pre-registered. The "demo N" tradeoff was documented in advance, not introduced post hoc.
