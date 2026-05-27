# Experiments

How we run A/B tests on Lumen. The first one is `001 — Subscription default ON` (see [pre-registration](experiments/001-subscription-default-on/preregistration.md) and [results](experiments/001-subscription-default-on/results.md)).

This document is the methodology doc. New experiments should follow the conventions described here.

---

## Why we run experiments here

Two reasons.

1. We need to know whether changes work, not feel like they work. A subjective "the new PDP looks better" is not the same as "the new PDP increases subscriber rate by 3 percentage points in a controlled comparison." The portfolio reader can see the difference.
2. The infrastructure to run experiments is the same infrastructure that powers the rest of the stack: the pixel writes events, Stape fans them out, Athena queries them. An A/B test is just a slice of that data with a treatment label.

## Anatomy of an experiment in this repo

```
experiments/
  001-subscription-default-on/
    preregistration.md      <- written BEFORE launch. The contract.
    queries/
      assignments.sql       <- experiment assignment table for GrowthBook
      purchases.sql         <- denominator for subscriber rate; numerator for conversion rate guardrail
      subscription_purchases.sql  <- numerator for subscriber rate
    simulate.py             <- synthetic traffic generator with controlled true effect
    requirements.txt        <- Python deps for simulate.py
    results.md              <- written AFTER analysis. Documents the call.
```

Each experiment owns one folder. Each folder is self-contained: someone reading it cold should be able to understand what was tested, how it was sized, how it was analyzed, and what was decided.

## The end-to-end flow

```
1. Pre-register     -> preregistration.md
2. Wire variants    -> theme/assets/lumen-experiment.js (assignment + cookie write)
                      theme/snippets/lumen-subscription-selector.liquid (the radio)
                      theme/assets/lumen-subscription-radio.js (cookie sync on change)
3. Forward variant  -> pixel/lumen-pixel.js (reads cookies, stamps data.experiment_id / data.variant / data.is_subscription)
4. Collect traffic  -> real visitors hit the storefront, or
                      experiments/<id>/simulate.py for synthetic
5. Analyze          -> GrowthBook UI, fed by Athena via the SQL in queries/
6. Decide           -> results.md, write up ship/no-ship with reasoning
```

## Writing a hypothesis

A good hypothesis has four parts.

1. **The change**: exactly what is different between control and treatment.
2. **The mechanism**: why the change should produce the predicted effect. If you can't articulate this, the test is fishing.
3. **The primary metric** and direction of success.
4. **The counter-hypothesis**: what could go wrong that the guardrail metric will catch.

Bad: *"Subscription default ON will lift subscribers."*

Good: *"Defaulting the subscription option to ON on the PDP will increase the subscriber rate without significantly hurting overall conversion rate. Mechanism: status quo bias — buyers indifferent between purchase types accept the default rather than actively switching. Primary metric: subscriber rate, expected to increase. Counter-hypothesis: defaulting to subscription may feel manipulative and cause cart abandonment; the guardrail on conversion rate exists to catch this."*

## Sizing a test

For a two-proportion z-test (binary outcome, control vs treatment):

```
n_per_variant = ((z_{α/2} + z_β)² × (p₁(1-p₁) + p₂(1-p₂))) / (p₂ - p₁)²
```

Where:
- `p₁` = baseline rate
- `p₂` = baseline + MDE (minimum detectable effect)
- `α` = false-positive rate (use 0.05)
- `β` = false-negative rate (use 0.20; equivalent to 80% power)
- `z_{α/2}` = 1.96 for two-sided α=0.05
- `z_β` = 0.84 for power=0.80

Worked example from experiment 001 (`p₁=0.12, p₂=0.15`):

```
n = ((1.96 + 0.84)² × (0.12×0.88 + 0.15×0.85)) / 0.03²
  = (7.84 × 0.2331) / 0.0009
  ≈ 2030 per arm
```

The required visitor count is then `n / conversion_rate`. At 2.5% conversion, that's ~80k visits per arm.

## Interpreting results

GrowthBook returns:
- A **point estimate** of the effect: e.g. +3.2 percentage points
- A **95% confidence interval**: e.g. [+0.4pp, +6.0pp]
- A **p-value**: e.g. 0.018
- An **SRM check**: chi-square test that the variant split is within tolerance

What "significant at p < 0.05" actually buys you: if the true effect were zero and the test ran identically a hundred times, fewer than five of those runs would show a result this extreme by chance.

What it does **not** buy you: certainty. A single p=0.04 result is more likely to be a false positive than the bare math suggests if you ran many tests, peeked, or sized for an effect smaller than what you actually find.

A CI that *includes zero* is failing to reject the null. A CI whose lower bound is well above zero is a real lift. A CI whose lower bound is just barely above zero deserves caution.

## Pitfalls

**Peeking.** Looking at results before the pre-registered sample size is reached, and stopping when the result looks significant, inflates the false-positive rate well above the nominal α. Pick N upfront. If you want valid early-stopping, use a group-sequential design (we don't).

**Multiple comparisons.** If you test 20 metrics, ~1 will look significant by chance at α=0.05. Pick ONE primary metric. Secondary metrics report-only. Guardrail is binary (violated / not violated), not a fishing target.

**Sample ratio mismatch (SRM).** If your variant split is supposed to be 50/50 and your actual split is 53/47 with N=20k, something is broken in the assignment system. Always run a chi-square test on observed vs expected counts. GrowthBook surfaces this in the SRM panel. A failing SRM check invalidates the run.

**Novelty / primacy effect.** Returning visitors may behave differently from new visitors in the first few days. Run for at least 14 days (or, for simulated, enough sessions to span the equivalent shopping cycles).

**Survivorship / selection bias.** Denominator is all *exposed* visitors, not just those who got far enough to convert. If exposure happens late in the funnel, you're conditioning on a population that already self-selected.

**Simpson's paradox.** A treatment that looks positive in aggregate but negative within every subgroup means there's a confounder. Check stratifications before shipping.

## The stack and why

| Layer | Tool | Why |
|---|---|---|
| Variant assignment | Custom JS, SHA-256 hash of `user_pseudo_id + ":" + experiment_id` mod 2 | Deterministic, sticky, no SDK runtime dependency. Pure function, mirrored in Python for synthetic traffic |
| Cookie bridge to pixel | First-party cookies `lumen_upid`, `lumen_exp`, `lumen_is_sub` | Pixel sandbox cannot read theme globals; `browser.cookie.get` does work cross-context for first-party cookies on the same domain |
| Event pipeline | Pixel → Stape → Lambda → S3 → Athena | Existing Phase 3 plumbing; experiment fields ride along in `data.*` |
| Authoring + analytics | GrowthBook (self-hosted local) | Open-source, owns the stats engine + SRM check + multiple-testing controls; reads from Athena natively |
| Synthetic traffic | `simulate.py` with controlled true effect | Dev store has no real traffic; synthetic lets us demonstrate the framework end-to-end |

**Honest tradeoffs documented elsewhere** (see [DECISIONS.md](DECISIONS.md), local-only):

- *GrowthBook SDK at runtime* — not used. GrowthBook lives on localhost during the build phase; the storefront cannot reach it. The hash-based assignment in `lumen-experiment.js` is the production runtime. GrowthBook is the authoring + analytics surface, fed by the events the same hash function produces from real users.
- *Subscription radio* — UI mock. No real Shopify selling plans are attached to products. The `is_subscription` field is purely a JS toggle. Adding real selling plans via Admin GraphQL (`sellingPlanGroupCreate`) is straightforward but not on the critical path for demonstrating the experimentation framework on synthetic traffic.
- *Shopify Rollouts (Winter '26 native A/B testing)* — evaluated, not used. It's a thin layer on top of theme branch switching; it does not own the statistics, does not integrate with our warehouse, and does not solve the problem the portfolio is demonstrating (rigorous experimentation with stats-engine support).

## How to add experiment 002

1. Make a folder: `experiments/002-<short-name>/`.
2. Write `preregistration.md` first. Copy the headers from 001's and fill in. Do not skip the sample size calculation.
3. Update `lumen-experiment.js` to handle multiple experiments. The current implementation hardcodes `EXPERIMENT_ID = "001"`; for 002 you'll want to either (a) run experiments in sequence and bump the constant, or (b) refactor to read a registry. (a) is fine for portfolio scale.
4. Add SQL queries under `experiments/002-<short-name>/queries/`.
5. Add a `simulate.py` if your test needs synthetic traffic. Copy 001's and change the funnel rates.
6. Author the experiment in GrowthBook with the same metric SQL.
7. Run.
8. Write `results.md`.

Each experiment leaves a paper trail.
