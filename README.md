# Lumen / DTC Growth Stack

**A working direct-to-consumer growth stack on Shopify built end-to-end as a portfolio project.**

[Live store](https://lumen-dev-d5fvasxb.myshopify.com) · [Source](https://github.com/fredfermin02/lumen-growth-stack)

---

## What this is

A stack for a fake beverage brand called **Lumen** (4 flavors: Clarity, Quiet, Bloom, Ember).

## The six phases

Each phase ships an artifact a real DTC team would use. Each phase also answers a question a real DTC team is asking.

### Phase 1 · Foundation ✅

> *Can customers actually buy something?*

A live Shopify store with branded theme, 4 products with variants, working checkout, and full inventory tracking. Every step is scripted  anyone with API access can rebuild the entire store with one command (`npm run seed`).

**Signal:** Can ship a working storefront, automate setup so it's reproducible.

### Phase 2 · Landing pages without engineering ✅

> *Can a marketer build a new landing page without filing a ticket?*

A library of **8 reusable page sections** (hero, comparison table, testimonials, FAQ, mission, sticky add-to-cart, bundle builder, more). Three audience-specific landing pages assembled from those sections in the Shopify theme editor.

Plus: **URL-driven content personalization**. A Facebook ad targeting athletes can land on the same page as a wellness ad and show different copy and imagery. One page, three audiences.

**Signal:** Builds tools, not just features. Marketers get autonomy; engineering doesn't become a bottleneck.

### Phase 3 · Server-side measurement 🚧 *in progress*

> *Do we actually know what's converting?*

Modern tracking pipeline: every important customer event (product view, add-to-cart, checkout, purchase) flows through a server we control before being forwarded to Google Analytics, Meta (Facebook), and our own data warehouse all with matching IDs so we can verify everything lines up.

### Phase 4 · Experimentation with rigor ⏳

> *How do we know our changes are working  not just feel like they are?*

A/B testing framework with a real hypothesis, sample-size math, and a pre-registered analysis plan. One real test on the product page: defaulting subscription to ON vs. one-time-purchase ON.

### Phase 5 · Unified analytics layer ⏳

> *Can a non-engineer get an honest answer to "what's our CAC by channel?"*

All data sources  store orders, web events, ad spend  flow into one warehouse. Daily transformations compute the metrics that drive decisions: conversion rate, customer acquisition cost, contribution margin, cohort retention. A public dashboard surfaces them.

---

## Current status

| Phase | What | Status |
|---|---|---|
| 1 | Storefront foundation | ✅ Shipped |
| 2 | Landing page system + URL personalization | ✅ Shipped |
| 3 | Server-side event tracking | 🚧 In progress |
| 4 | A/B testing framework | ⏳ Planned |
| 5 | Warehouse + dbt + dashboards | ⏳ Planned |
| 6 | README polish + walkthrough video | ⏳ Planned |

## See it for yourself

- **Live store:** [lumen-dev-d5fvasxb.myshopify.com](https://lumen-dev-d5fvasxb.myshopify.com)  Shopify dev store, password-protected (ask for the password)
- **Featured landing pages:**
  - [For athletes](https://lumen-dev-d5fvasxb.myshopify.com/pages/lp-athletes)
  - [Everyday wellness](https://lumen-dev-d5fvasxb.myshopify.com/pages/lp-wellness)
  - [Festival edition](https://lumen-dev-d5fvasxb.myshopify.com/pages/lp-festival)  includes the Build-Your-Own bundle picker

## The stack, in one line each

- **Storefront**  Shopify with the Horizon theme (the new reference theme in 2026)
- **Custom code**  TypeScript everywhere it makes sense; modern Shopify Liquid where Shopify expects it
- **Server-side tracking**  Stape (managed sGTM, free tier) fans out to Google Analytics, Meta, and AWS
- **Data warehouse**  AWS S3 + Athena, queryable with standard SQL, ~$0/month at this scale
- **Infrastructure as code**  AWS SAM template, deployable with a single command
- **Zero bundle apps, zero page builders**  everything custom-built using native Shopify APIs

## Operating cost

The whole stack runs for **under $5/month** at portfolio traffic.

## How this repo is organized

```
├── theme/                      Shopify Horizon theme + 8 custom Lumen sections
├── scripts/seed/               TypeScript scripts that rebuild the store from scratch
├── services/events-webhook/    AWS Lambda for server-side event tracking
├── infra/                      AWS infrastructure (SAM template, Athena schema)
├── docs/                       Spec, architecture diagrams, event schema
└── pixel/                      Shopify Custom Pixel (analytics.subscribe)
```
