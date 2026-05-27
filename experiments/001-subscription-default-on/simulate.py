#!/usr/bin/env python3
"""
Synthetic traffic generator for experiment 001 (subscription-default-on).

Posts realistic-looking events to the Stape sGTM Data Client at /lumen, which
fans them out to the Lambda (S3/Athena) and to GA4. Each synthetic visitor is
bucketed into control or treatment via the same SHA-256 hash function the
storefront uses (theme/assets/lumen-experiment.js), so a real PDP visit and a
synthetic visit with the same user_pseudo_id land in the same arm.

True effect baked into the simulation:
  - control:    12.0% subscriber rate, 2.5% conversion rate
  - treatment:  15.0% subscriber rate, 2.5% conversion rate
  - guardrail (conversion) unaffected — this is the "no harm" hypothesis

Funnel modeled per visitor:
  product_viewed                        (always)
  product_added_to_cart                 (40% of viewers)
  checkout_started + checkout_completed (2.5% of viewers — conversion)
  is_subscription on the cart/checkout  (12% or 15% depending on arm)

Usage:
  pip install -r requirements.txt
  python simulate.py --n 100 --dry-run
  python simulate.py --n 20000 --endpoint https://pvpskmis.usu.stape.io/lumen

The endpoint defaults to the project's Stape URL. No auth header is needed —
Stape's Data Client accepts unauthenticated POSTs on /lumen, and the bearer
token to the Lambda is added downstream by the JSON HTTP Request tag in sGTM.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from tqdm.asyncio import tqdm

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EXPERIMENT_ID = "001"
SHOP = "lumen-dev-d5fvasxb.myshopify.com"
DEFAULT_ENDPOINT = "https://pvpskmis.usu.stape.io/lumen"

# Funnel rates per arm. Tweak these in code when modeling alternate scenarios.
RATES = {
    "control": {"add_to_cart": 0.40, "conversion": 0.025, "subscription": 0.12},
    "treatment": {"add_to_cart": 0.40, "conversion": 0.025, "subscription": 0.15},
}

# Product catalog mirroring the seed (4 flavors, single can + 12-pack variants).
PRODUCTS = [
    {"id": "9000000000001", "title": "Clarity", "price": 4.50},
    {"id": "9000000000002", "title": "Quiet", "price": 4.50},
    {"id": "9000000000003", "title": "Bloom", "price": 4.50},
    {"id": "9000000000004", "title": "Ember", "price": 4.50},
]


# ---------------------------------------------------------------------------
# Variant assignment — must match theme/assets/lumen-experiment.js
# ---------------------------------------------------------------------------

def assign_variant(upid: str, experiment_id: str = EXPERIMENT_ID) -> str:
    """Same algorithm as the JS: hex(sha256(upid:experiment_id))[-2:] mod 2.

    `control` = even, `treatment` = odd.
    """
    digest = hashlib.sha256(f"{upid}:{experiment_id}".encode("utf-8")).hexdigest()
    bucket = int(digest[-2:], 16)  # 0..255
    return "control" if bucket % 2 == 0 else "treatment"


# ---------------------------------------------------------------------------
# Event payload builders
# ---------------------------------------------------------------------------

@dataclass
class SimulatedVisitor:
    upid: str
    variant: str
    product: dict
    visited_at: datetime
    add_to_cart: bool
    converted: bool
    is_subscription: bool


def now_iso(dt: Optional[datetime] = None) -> str:
    dt = dt or datetime.now(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def build_event(
    visitor: SimulatedVisitor,
    event_name: str,
    occurred_at: datetime,
    value: float,
    extra_data: dict,
) -> dict:
    return {
        "event_id": str(uuid.uuid4()),
        "event_name": event_name,
        "occurred_at": now_iso(occurred_at),
        "shop": SHOP,
        "user_pseudo_id": visitor.upid,
        "value": value,
        "currency": "USD",
        "data": {
            **extra_data,
            "experiment_id": EXPERIMENT_ID,
            "variant": visitor.variant,
            "is_subscription": visitor.is_subscription,
        },
    }


def events_for_visitor(visitor: SimulatedVisitor) -> list[dict]:
    p = visitor.product
    # Stagger downstream events a few seconds after the view for realistic order.
    view_at = visitor.visited_at
    cart_at = view_at + timedelta(seconds=random.randint(20, 180))
    checkout_started_at = cart_at + timedelta(seconds=random.randint(60, 600))
    checkout_completed_at = checkout_started_at + timedelta(
        seconds=random.randint(45, 240)
    )

    events: list[dict] = [
        build_event(
            visitor,
            "product_viewed",
            view_at,
            p["price"],
            {
                "product_id": p["id"],
                "product_title": p["title"],
                "variant_id": f"{p['id']}-single",
                "variant_title": "Single can",
                "sku": f"LUMEN-{p['title'][:3].upper()}-1",
            },
        )
    ]

    if not visitor.add_to_cart:
        return events

    quantity = random.choice([1, 1, 1, 2, 3, 12])  # weighted toward single cans
    line_total = round(p["price"] * quantity, 2)
    events.append(
        build_event(
            visitor,
            "product_added_to_cart",
            cart_at,
            line_total,
            {
                "product_id": p["id"],
                "product_title": p["title"],
                "variant_id": f"{p['id']}-single",
                "variant_title": "Single can",
                "sku": f"LUMEN-{p['title'][:3].upper()}-1",
                "quantity": quantity,
            },
        )
    )

    if not visitor.converted:
        return events

    checkout_token = uuid.uuid4().hex
    line_items = [
        {
            "variant_id": f"{p['id']}-single",
            "product_id": p["id"],
            "title": p["title"],
            "quantity": quantity,
        }
    ]

    events.append(
        build_event(
            visitor,
            "checkout_started",
            checkout_started_at,
            line_total,
            {"checkout_id": checkout_token, "line_items": line_items},
        )
    )
    events.append(
        build_event(
            visitor,
            "checkout_completed",
            checkout_completed_at,
            line_total,
            {
                "order_id": f"order-{uuid.uuid4().hex[:8]}",
                "checkout_id": checkout_token,
                "line_items": line_items,
            },
        )
    )
    return events


def simulate_visitors(n: int, rng: random.Random) -> list[SimulatedVisitor]:
    visitors: list[SimulatedVisitor] = []
    now = datetime.now(timezone.utc)
    for _ in range(n):
        upid = str(uuid.UUID(int=rng.getrandbits(128), version=4))
        variant = assign_variant(upid)
        rates = RATES[variant]
        product = rng.choice(PRODUCTS)

        # Spread visits over the last 6 hours to avoid hammering a single second.
        visited_at = now - timedelta(seconds=rng.randint(0, 6 * 60 * 60))
        add_to_cart = rng.random() < rates["add_to_cart"]
        converted = add_to_cart and rng.random() < (
            rates["conversion"] / max(rates["add_to_cart"], 1e-6)
        )
        is_subscription = converted and rng.random() < rates["subscription"]

        visitors.append(
            SimulatedVisitor(
                upid=upid,
                variant=variant,
                product=product,
                visited_at=visited_at,
                add_to_cart=add_to_cart,
                converted=converted,
                is_subscription=is_subscription,
            )
        )
    return visitors


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def summarize(visitors: list[SimulatedVisitor]) -> str:
    by_arm: dict[str, dict[str, int]] = {
        "control": {"n": 0, "atc": 0, "conv": 0, "sub": 0},
        "treatment": {"n": 0, "atc": 0, "conv": 0, "sub": 0},
    }
    for v in visitors:
        a = by_arm[v.variant]
        a["n"] += 1
        if v.add_to_cart:
            a["atc"] += 1
        if v.converted:
            a["conv"] += 1
        if v.is_subscription:
            a["sub"] += 1

    lines = [
        "arm        | visitors |   ATC%   |  conv%   |  sub-of-conv%",
        "-----------+----------+----------+----------+--------------",
    ]
    for arm, a in by_arm.items():
        atc_pct = (a["atc"] / a["n"] * 100) if a["n"] else 0
        conv_pct = (a["conv"] / a["n"] * 100) if a["n"] else 0
        sub_pct = (a["sub"] / a["conv"] * 100) if a["conv"] else 0
        lines.append(
            f"{arm:<10} | {a['n']:>8} | {atc_pct:>7.2f}% | {conv_pct:>7.2f}% | {sub_pct:>11.2f}%"
        )

    total = sum(a["n"] for a in by_arm.values())
    expected_each = total / 2
    srm_ratio = (
        max(by_arm["control"]["n"], by_arm["treatment"]["n"]) / expected_each
        if expected_each
        else 0
    )
    lines.append("")
    lines.append(f"total visitors: {total}  (SRM ratio max-arm/expected = {srm_ratio:.3f})")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Sender
# ---------------------------------------------------------------------------

async def post_event(
    client: httpx.AsyncClient,
    endpoint: str,
    event: dict,
    semaphore: asyncio.Semaphore,
) -> bool:
    async with semaphore:
        try:
            resp = await client.post(endpoint, json=event, timeout=10.0)
            return 200 <= resp.status_code < 300
        except Exception as e:
            print(f"  ! POST failed: {e}", file=sys.stderr)
            return False


async def send_all(events: list[dict], endpoint: str, concurrency: int) -> int:
    semaphore = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_keepalive_connections=concurrency, max_connections=concurrency * 2)
    success_count = 0

    async with httpx.AsyncClient(limits=limits) as client:
        tasks = [post_event(client, endpoint, e, semaphore) for e in events]
        for coro in tqdm.as_completed(tasks, total=len(tasks), desc="POST events"):
            ok = await coro
            if ok:
                success_count += 1
    return success_count


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Synthetic traffic generator for experiment 001."
    )
    parser.add_argument("--n", type=int, default=100, help="Number of synthetic visitors")
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"Stape Data Client endpoint (default: {DEFAULT_ENDPOINT})",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--concurrency", type=int, default=20, help="Concurrent in-flight POSTs"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate and summarize without POSTing anywhere",
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    print(f"→ Simulating {args.n} visitors (seed={args.seed})")
    visitors = simulate_visitors(args.n, rng)

    events: list[dict] = []
    for v in visitors:
        events.extend(events_for_visitor(v))

    print(f"→ Generated {len(events)} events across {len(visitors)} visitors")
    print()
    print(summarize(visitors))
    print()

    if args.dry_run:
        print("→ --dry-run: not POSTing anything")
        return 0

    print(f"→ POSTing to {args.endpoint} (concurrency={args.concurrency})")
    success = asyncio.run(send_all(events, args.endpoint, args.concurrency))
    print(f"→ {success}/{len(events)} events accepted by Stape")
    if success < len(events):
        print(
            f"  ⚠ {len(events) - success} events failed — check Stape logs and rerun "
            f"this script with a different --seed if you want fresh upids."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
