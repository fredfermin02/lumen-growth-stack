#!/usr/bin/env bash
# Send a bearer-authenticated POST to the events webhook for smoke testing.
#
# Usage:
#   ENDPOINT=http://localhost:3030/events TOKEN=abc123 ./test-webhook.sh
#   ENDPOINT=https://abcd.lambda-url.us-east-1.on.aws/ \
#     TOKEN=$(aws ssm get-parameter --name lumen-stape-bearer-token --with-decryption --query 'Parameter.Value' --output text) \
#     ./test-webhook.sh

set -euo pipefail

ENDPOINT="${ENDPOINT:?ENDPOINT env var required (e.g. http://localhost:3030/events)}"
TOKEN="${TOKEN:?TOKEN env var required (bearer token)}"

EVENT_ID="${EVENT_ID:-test-$(date +%s)-$$}"

BODY=$(cat <<EOF
{
  "event_id": "${EVENT_ID}",
  "event_name": "test_event",
  "occurred_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "shop": "lumen-dev-d5fvasxb.myshopify.com",
  "user_pseudo_id": "test-user",
  "value": 4.50,
  "currency": "USD",
  "data": { "smoke_test": true }
}
EOF
)

echo "→ POST ${ENDPOINT}"
echo "  event_id: ${EVENT_ID}"
echo ""

curl -sS -X POST "${ENDPOINT}" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${TOKEN}" \
  --data-raw "${BODY}" \
  -w "\n→ HTTP %{http_code} in %{time_total}s\n"
