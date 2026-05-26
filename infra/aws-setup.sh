#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="lumen-events"
BEARER_TOKEN_PARAM="lumen-stape-bearer-token"

cd "$(dirname "$0")/.."

# Pre-flight
aws sts get-caller-identity --output text >/dev/null \
  || { echo "✗ Run 'aws configure' first"; exit 1; }

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "→ Deploying to account ${ACCOUNT_ID} / region ${REGION}"

# Create SSM SecureString param if missing (SAM can't create SecureString)
if aws ssm get-parameter --name "${BEARER_TOKEN_PARAM}" --region "${REGION}" >/dev/null 2>&1; then
  echo "  ✓ ${BEARER_TOKEN_PARAM} already exists, skipping create"
else
  TOKEN=$(openssl rand -hex 32)
  aws ssm put-parameter \
    --name "${BEARER_TOKEN_PARAM}" \
    --type SecureString \
    --value "${TOKEN}" \
    --region "${REGION}" \
    --description "Bearer token Stape sends in the Authorization header to events-webhook Lambda" \
    >/dev/null
  echo "  ✓ ${BEARER_TOKEN_PARAM} created"
  echo ""
  echo "  📋 COPY THIS BEARER TOKEN INTO STAPE NOW (only shown once):"
  echo "     ${TOKEN}"
  echo ""
fi

# Build the Lambda bundle
echo "→ Building Lambda bundle"
( cd services/events-webhook && npm run build )

# SAM build + deploy
echo "→ sam build"
sam build --template infra/template.yaml

echo "→ sam deploy"
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides "BearerTokenParamName=${BEARER_TOKEN_PARAM}" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# Capture outputs
FN_URL=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionUrl`].OutputValue' \
  --output text)

BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Create / refresh the dedup view via Athena
echo "→ Creating Athena dedup view"
QUERY_ID=$(aws athena start-query-execution \
  --query-string "$(cat infra/athena/raw_events.sql)" \
  --work-group lumen \
  --region "${REGION}" \
  --query QueryExecutionId \
  --output text)

# Wait briefly for the view to materialize
for _ in 1 2 3 4 5; do
  STATE=$(aws athena get-query-execution \
    --query-execution-id "${QUERY_ID}" \
    --region "${REGION}" \
    --query 'QueryExecution.Status.State' \
    --output text)
  if [[ "${STATE}" == "SUCCEEDED" ]]; then break; fi
  if [[ "${STATE}" == "FAILED" || "${STATE}" == "CANCELLED" ]]; then
    echo "✗ Athena view creation failed (${STATE})"
    aws athena get-query-execution --query-execution-id "${QUERY_ID}" --region "${REGION}" \
      --query 'QueryExecution.Status.StateChangeReason' --output text
    exit 1
  fi
  sleep 2
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Phase 3 infrastructure deployed."
echo ""
echo "  Lambda Function URL: ${FN_URL}"
echo "  Events bucket:       s3://${BUCKET}/raw/"
echo "  Athena workgroup:    lumen"
echo "  Athena database:     lumen_analytics"
echo ""
echo "  Next:"
echo "    1. Paste the Function URL into Stape's JSON HTTP Request Tag"
echo "    2. Add header 'Authorization: Bearer <token>' using the value printed above"
echo "    3. Smoke test via: scripts/test-webhook.sh"
echo "═══════════════════════════════════════════════════════════════"
