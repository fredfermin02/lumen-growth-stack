# DTC Growth Stack — Build Specification

> A portfolio project demonstrating full-stack growth engineering capabilities for a Shopify-based DTC beverage brand. Built to demonstrate end-to-end ownership of conversion-focused web experiences, server-side tracking, experimentation, and unified analytics.

---

## 1. Project Overview

### Goal
Build a working miniature DTC growth stack on a Shopify dev store that demonstrates:
1. A templated landing page system with reusable, marketer-configurable sections
2. Server-side event tracking with full event parity across analytics destinations
3. A working A/B testing framework with statistical rigor
4. A unified analytics layer (warehouse + dashboards) pulling from multiple sources
5. Conversion-focused PDP and checkout flow

### Deliverables
- **Public Shopify dev store** with custom theme and 4–6 SKUs
- **GitHub repo** with all code, theme files, server-side container config, dbt models, and infrastructure-as-code
- **Public dashboard** (Hex or Metabase) showing the metrics
- **README** with architecture diagram and decision log
- **5-minute Loom video** walking through the system

### Fake brand
Create a fake adaptogenic beverage brand (NOT a direct Be LOVE clone). Suggested:
- Brand name: something invented, e.g., "Tonic Co." or "Drift" or "Verve"
- Product: 4 flavors of a functional beverage
- Use AI-generated product photography (Midjourney, DALL-E) or licensed stock

---

## 2. Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Ecommerce platform | Shopify (dev store, free) | Matches target environment |
| Theme base | Dawn (Shopify's reference theme) or a fresh Liquid theme | Free, well-documented |
| Headless frontend (optional stretch) | Next.js + Shopify Storefront API | Demonstrates headless skill if time permits |
| Server-side tagging | Stape.io free tier OR self-hosted GTM SS on Google Cloud Run | Stape is faster to set up; GCR shows infra skill |
| Client analytics | GA4, Meta Pixel (test mode), TikTok Pixel (test mode) | Standard DTC stack |
| Experimentation | GrowthBook (self-hosted, open source) | Free, server-side, modern |
| Data ingestion | Airbyte (self-hosted) OR Shopify webhooks → Cloud Function | Airbyte is more impressive |
| Warehouse | Google BigQuery (free tier) | Industry standard, generous free tier |
| Transformation | dbt Core (free) | Industry standard |
| BI / dashboarding | Hex (free tier) or Metabase (self-hosted) | Hex looks more polished |
| Hosting (for any custom services) | Google Cloud Run or Vercel | Pay-per-use, near-zero idle cost |
| Code | GitHub (public repo) | Portfolio visibility |

### Budget target
Total monthly cost when running: **under $20/month**. Most of it is on free tiers. Document costs in the README — pragmatic cost management is part of the signal.

---

## 3. Build Phases

Build in this order. Each phase produces a shippable, demonstrable artifact. **Do not move to the next phase until the previous one works end-to-end.**

### Phase 1: Shopify foundation (5–8 hours)
**Goal:** A working dev store with branded theme and product catalog.

Tasks:
- [ ] Sign up for a Shopify Partners account; create a development store
- [ ] Install the Dawn theme as a starting point
- [ ] Create the fake brand identity: logo (use a simple wordmark), color palette, typography
- [ ] Customize theme settings: colors, fonts, header, footer
- [ ] Create 4 products with:
  - High-quality product images (1 hero shot + 2 lifestyle shots each)
  - Detailed product descriptions
  - Price, SKU, inventory
  - Product tags for filtering/segmentation
- [ ] Create collection pages (e.g., "Shop All," "Hydration Line")
- [ ] Set up shipping zones and a test payment gateway (Shopify Bogus Gateway for testing)
- [ ] Configure a placeholder domain on the dev store

Acceptance: a visitor can land on the homepage, browse products, add to cart, and complete a fake checkout.

### Phase 2: Templated landing page system (8–12 hours)
**Goal:** A library of reusable, configurable Shopify sections that lets a "marketer" build new LPs without touching code.

Tasks:
- [ ] Design the section library. Build these as Shopify sections (Liquid + JSON schema):
  - `hero-split` — image left, copy right (or reverse); configurable CTA, eyebrow text, headline, subhead
  - `hero-fullbleed` — full-width image background with overlay text
  - `comparison-table` — configurable rows/columns for "us vs them" content
  - `testimonial-grid` — pulls from a metaobject; configurable number of items
  - `sticky-buy-bar` — sticky CTA that appears on scroll; mobile-optimized
  - `faq-accordion` — configurable Q&A blocks
  - `mission-block` — for cause/mission storytelling (charity, sustainability)
  - `bundle-builder` — lets users pick multiple flavors and adds them as a bundle
- [ ] Set up **metaobjects** for structured reusable content:
  - `testimonial` (name, quote, rating, product reference, photo)
  - `comparison_point` (claim, our_value, competitor_value)
  - `faq_item` (question, answer, category)
- [ ] Build 3 example landing pages using only the section library:
  - LP1: "Athletes" angle (performance, electrolytes, recovery)
  - LP2: "Everyday wellness" angle (clean ingredients, daily ritual)
  - LP3: "Festival" angle (mission, community, partnership messaging)
- [ ] Implement **UTM-based dynamic content swap**:
  - URL params like `?audience=athletes` swap hero copy/imagery to match
  - Implement with a small JS module that reads URL params and updates DOM after page load (or, more elegantly, with a Cloudflare Worker / Shopify App Proxy for server-side rendering)
  - Document the tradeoff between client-side flicker and server-side complexity

Acceptance: a non-developer could open the Shopify theme editor and assemble a new LP from the section library in under 30 minutes. Document this with a short Loom showing the editor experience.

### Phase 3: Server-side event tracking (8–12 hours)
**Goal:** All ecommerce events flow through a server-side container with full event parity to GA4, Meta CAPI, and a webhook destination.

Tasks:
- [ ] Set up Stape.io (free tier) OR deploy GTM Server container on Google Cloud Run
  - If Cloud Run: containerize the official GTM server image, deploy, set up a custom domain (e.g., `data.yourdomain.com`)
- [ ] Configure the Web container (client-side GTM) on the Shopify theme:
  - Install GTM snippet in `theme.liquid` head
  - Fire standard ecommerce events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `view_search_results`
  - Use Shopify's `analytics.subscribe` API for first-party event capture (preferred over scraping the DOM)
- [ ] Configure the Server container:
  - Receive events from the Web container
  - Generate a unique `event_id` for each event for deduplication
  - Forward to GA4 via Measurement Protocol
  - Forward to Meta via Conversions API (test mode — get a test access token from Meta Events Manager)
  - Forward to a webhook endpoint (Cloud Function) that writes the raw event to BigQuery for the warehouse layer
- [ ] Implement **deduplication**: ensure that if the client-side pixel and server-side event both fire, Meta dedupes on `event_id`
- [ ] Verify with Meta's Events Manager that events are received with high "Event Match Quality" scores
- [ ] Document the event schema in a `events.md` file in the repo:
  - Event name
  - Required fields
  - Optional fields
  - Trigger conditions
  - Destinations

Acceptance: trigger a test purchase. Verify the event appears in GA4 DebugView, Meta Events Manager (test events), and the BigQuery raw events table — all with the same `event_id`.

### Phase 4: A/B testing framework (6–10 hours)
**Goal:** A working experimentation system with proper statistical methodology.

Tasks:
- [ ] Self-host GrowthBook (Docker on Cloud Run or any small VPS) OR use their free cloud tier
- [ ] Install the GrowthBook SDK in the Shopify theme (JavaScript SDK)
- [ ] Wire up GrowthBook to use the same user identifier as your analytics (Shopify customer ID for logged-in users, a first-party cookie for anonymous users)
- [ ] Pipe purchase events from BigQuery → GrowthBook as the conversion source (GrowthBook supports BigQuery as a data warehouse)
- [ ] Build and run **one real-feeling A/B test** on the PDP:
  - Hypothesis: "Defaulting the subscription option to ON will increase subscriber rate without significantly hurting overall conversion rate"
  - Variants: control (one-time purchase selected) vs. treatment (subscribe & save 15% pre-selected)
  - Primary metric: subscriber rate
  - Secondary metric: revenue per visitor
  - Guardrail: overall purchase conversion rate (must not drop by more than 5%)
  - Sample size calculation: document the expected MDE, baseline rate, and required sample size before launching
  - Pre-registered analysis plan: written down before the test starts
- [ ] If you don't have real traffic, simulate it: write a script that generates synthetic visitor + purchase events with a controlled "true" effect, run the test on synthetic data, and demonstrate the framework correctly detects the effect
- [ ] Document the methodology in a `experiments.md` file: how to write a hypothesis, how to size a test, how to interpret results, common pitfalls (peeking, multiple comparisons, novelty effects)

Acceptance: a running experiment in GrowthBook with documented hypothesis, sample size calc, and (real or simulated) results. The methodology doc should be good enough to onboard a junior PM.

### Phase 5: Unified analytics layer (10–15 hours)
**Goal:** A warehouse pulling from multiple sources, dbt models transforming raw data, and a dashboard showing the metrics that matter.

Tasks:
- [ ] Set up BigQuery in Google Cloud (free tier covers everything at this scale)
- [ ] Build data ingestion:
  - **Shopify orders → BigQuery**: use Airbyte OR a Cloud Function triggered by Shopify webhooks (`orders/create`, `orders/updated`, `customers/create`)
  - **Raw web events → BigQuery**: already done in Phase 3 via the server-side container webhook
  - **(Optional) Klaviyo events → BigQuery**: via Airbyte or Klaviyo's API
  - **(Optional) Ad spend data**: manually upload a CSV of fake ad spend data for Meta/Google/TikTok to demonstrate the marketing reporting layer
- [ ] Build dbt models. Suggested project structure:
  ```
  models/
    staging/
      stg_shopify__orders.sql
      stg_shopify__customers.sql
      stg_web__events.sql
      stg_ads__spend.sql
    intermediate/
      int_orders_with_attribution.sql
      int_customer_first_order.sql
    marts/
      fct_orders.sql
      dim_customers.sql
      daily_metrics.sql
      cohort_retention.sql
      channel_performance.sql
  ```
- [ ] Define the canonical business metrics in dbt with tests:
  - Conversion rate (sessions → orders)
  - AOV (average order value)
  - CAC (blended and by channel)
  - Repeat purchase rate (30/60/90 day)
  - Subscriber rate
  - Contribution margin per order
- [ ] Add **dbt tests**: `unique`, `not_null`, `relationships`, plus custom tests for business logic (e.g., "no order should have negative revenue")
- [ ] Build a dashboard in Hex or Metabase. At minimum:
  - Daily revenue (last 30 days)
  - Conversion rate trend
  - Top products by revenue
  - Cohort retention table
  - Channel performance (CAC, ROAS by channel)
  - Subscriber growth
- [ ] Schedule dbt to run hourly via dbt Cloud (free tier) or GitHub Actions + cron

Acceptance: a public read-only dashboard URL. dbt models all pass tests. README documents the data flow with a diagram.

### Phase 6: Polish, document, ship (6–10 hours)
**Goal:** Make the project legible to a hiring manager in under 10 minutes.

Tasks:
- [ ] Write the README. Required sections:
  - **Problem statement**: what challenge does this solve for a DTC brand?
  - **Architecture diagram** (use Excalidraw, Mermaid, or draw.io)
  - **Tech choices and why**: for each major tool, explain the decision and what you considered as alternatives
  - **What I'd do differently with more time**
  - **Cost breakdown**: actual monthly cost to run this
  - **How to reproduce**: setup instructions for someone wanting to clone
- [ ] Write a separate **decision log** (`DECISIONS.md`) with at least 5 entries documenting tradeoffs you made (e.g., "Chose Stape over self-hosted GTM SS because..." — even if you self-hosted, document why)
- [ ] Add screenshots: PDP, landing page editor showing reusable sections, GTM server config, GrowthBook experiment, Hex dashboard
- [ ] Record a 5-minute Loom video walking through the system. Script:
  - 30s: problem & what you built
  - 1m: tour of the live store (PDP, an LP, the bundle builder)
  - 1m: server-side tagging in action (show event firing in dev tools + GA4 DebugView + Meta Events Manager)
  - 1m: experimentation framework (show a running test in GrowthBook)
  - 1m: warehouse + dashboard (show dbt DAG + dashboard with key metrics)
  - 30s: what you'd build next
- [ ] Publish:
  - GitHub repo public, README polished
  - Live store URL accessible
  - Dashboard URL public and read-only
  - Loom video linked from README
- [ ] Write a short blog post or LinkedIn post summarizing the project and what you learned. Even one post gets the project in front of more eyes than the repo alone.

---

## 4. Code Quality Standards

The code is part of the demo. Hold it to a standard you'd want a hiring manager to see:

- **TypeScript** for any JavaScript code where reasonable
- **Liquid templates**: clean, commented, no inline styles, use Shopify section schemas properly
- **dbt models**: every model has a schema.yml with descriptions and tests
- **Cloud Functions / server code**: typed, with error handling, with at least basic logging
- **Infrastructure**: define in code where possible (Terraform for GCP resources, or at minimum a setup script)
- **Secrets**: never committed. Use `.env.example` files and document required env vars in the README
- **Git hygiene**: meaningful commit messages, no commits to main with broken code, a clean commit history

---

## 5. Stretch Goals (only if Phases 1–6 are solid)

Pick at most one. These are "and one more thing" flourishes:

### Option A: AI-powered PDP copy generator
A small admin tool (Streamlit or Next.js page) where a marketer can paste a product description and get back 3 variants of hero copy generated by an LLM, with the option to push them straight into a GrowthBook experiment. Demonstrates AI-native product thinking.

### Option B: Headless storefront for one product
Build a Next.js or Hydrogen frontend for *one* product that consumes the Shopify Storefront API. Show side-by-side: stock Shopify PDP vs. the headless version, with Core Web Vitals comparison. Demonstrates that you understand when headless is worth it (and when it isn't — make that argument in the README).

### Option C: Post-purchase upsell flow
Build a one-click post-purchase upsell page (Shopify Plus has a native API for this; on a dev store, simulate it with a custom Liquid template on the thank-you page). Track and report the incremental revenue from the upsell in the warehouse.

---

## 6. Anti-Goals

Things to explicitly NOT do, because they'd hurt the demo:

- ❌ Don't redesign drink.love or any real competitor's site. Build on a fake brand.
- ❌ Don't use enterprise tools (Snowflake, Segment paid, Optimizely) when free/cheap equivalents prove the same skill.
- ❌ Don't over-engineer. A working 60% is better than an aspirational 100%.
- ❌ Don't skip the README. The thing that gets you the job isn't the code — it's the artifact that makes the code legible.
- ❌ Don't use sensitive data or real customer info anywhere, even fake-named.
- ❌ Don't claim functionality that isn't actually working. If a phase is partial, mark it clearly.

---

## 7. Definition of Done

The project is shippable when:

1. ✅ A stranger can visit the live Shopify store and complete a fake checkout
2. ✅ A test purchase triggers events visible in GA4, Meta Events Manager, AND the BigQuery raw events table — all with matching `event_id`
3. ✅ At least one A/B test is configured in GrowthBook with documented hypothesis, sample size calc, and (real or simulated) results
4. ✅ The dashboard URL is public and shows live metrics from the warehouse
5. ✅ The README answers: what is this, why does it exist, how does it work, what would you change?
6. ✅ The Loom video is published and linked from the README
7. ✅ The GitHub repo has a clean commit history and a clear file structure

---

## 8. Suggested Build Order Recap (single-page checklist)

```
Phase 1: Shopify dev store with branded theme + 4 SKUs    [5–8h]
Phase 2: Section library + 3 LPs + UTM dynamic content    [8–12h]
Phase 3: Server-side GTM + GA4 + Meta CAPI + webhook      [8–12h]
Phase 4: GrowthBook + 1 experiment + methodology doc      [6–10h]
Phase 5: BigQuery + dbt + dashboard                       [10–15h]
Phase 6: README + decision log + Loom + ship              [6–10h]

Total: ~45–70 hours
```

If time-boxed under 25 hours, build only Phases 1, 3, and 5 (skip the LP system and experimentation framework — focus on the data infrastructure story). Mark the others as "next iteration" in the README.

---

## 9. Final Note for the Coding Assistant

This project's audience is a hiring manager evaluating full-stack growth engineering skills. The code does not need to be production-grade for thousands of customers — it needs to be **legible, well-documented, and demonstrate sound architectural judgment for a DTC brand at $5–50M ARR scale.**

When in doubt:
- Choose the pragmatic tool over the prestigious one
- Choose the documented approach over the clever one
- Choose to ship and iterate over to polish indefinitely

Build for the reader of the README, not just the user of the site.
