#!/usr/bin/env bash
# Send an HMAC-signed POST to the events webhook for smoke testing.
#
# Usage:
#   ENDPOINT=http://localhost:3030/events SECRET=abc123 ./test-webhook.sh
#   ENDPOINT=https://abcd.lambda-url.us-east-1.on.aws/ SECRET=$(aws ssm get-parameter --name /lumen/stape-hmac-secret --with-decryption --query 'Parameter.Value' --output text) ./test-webhook.sh

set -euo pipefail

ENDPOINT="${ENDPOINT:?ENDPOINT env var required (e.g. http://localhost:3030/events)}"
SECRET="${SECRET:?SECRET env var required (HMAC shared secret)}"

TIMESTAMP=$(date +%s)000
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

# Compact the body for HMAC (Lambda receives raw body string)
COMPACT_BODY=$(echo -n "${BODY}" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), separators=(',',':')))")

SIGNATURE=$(printf "%s.%s" "${TIMESTAMP}" "${COMPACT_BODY}" | openssl dgst -sha256 -hmac "${SECRET}" -binary | xxd -p -c 256)

echo "→ POST ${ENDPOINT}"
echo "  event_id: ${EVENT_ID}"
echo "  timestamp: ${TIMESTAMP}"
echo ""

curl -sS -X POST "${ENDPOINT}" \
  -H "content-type: application/json" \
  -H "x-stape-signature: sha256=${SIGNATURE}" \
  -H "x-stape-timestamp: ${TIMESTAMP}" \
  --data-raw "${COMPACT_BODY}" \
  -w "\n→ HTTP %{http_code} in %{time_total}s\n"
