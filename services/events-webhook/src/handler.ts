import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from "aws-lambda";
import { verifyBearer } from "./auth.ts";
import { eventSchema, partitionDate, toRawEventRow } from "./schema.ts";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const S3_BUCKET = required("S3_BUCKET");
const BEARER_TOKEN_PARAM = required("BEARER_TOKEN_PARAM");

const s3 = new S3Client({ region: REGION });
const ssm = new SSMClient({ region: REGION });

let tokenCache: { value: string; fetchedAt: number } | null = null;
const TOKEN_TTL_MS = 5 * 60 * 1000;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function getBearerToken(): Promise<string> {
  const override = process.env.BEARER_TOKEN_LOCAL;
  if (override) return override;

  if (tokenCache && Date.now() - tokenCache.fetchedAt < TOKEN_TTL_MS) {
    return tokenCache.value;
  }
  const res = await ssm.send(
    new GetParameterCommand({ Name: BEARER_TOKEN_PARAM, WithDecryption: true }),
  );
  const value = res.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${BEARER_TOKEN_PARAM} is empty`);
  tokenCache = { value, fetchedAt: Date.now() };
  return value;
}

function respond(statusCode: number, body: unknown): LambdaFunctionURLResult {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(
  event: LambdaFunctionURLEvent,
): Promise<LambdaFunctionURLResult> {
  if ((event.requestContext.http.method ?? "POST").toUpperCase() !== "POST") {
    return respond(405, { ok: false, reason: "method_not_allowed" });
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf8")
    : event.body ?? "";

  const headers = lowercaseHeaders(event.headers ?? {});

  let expectedToken: string;
  try {
    expectedToken = await getBearerToken();
  } catch (err) {
    console.error("ssm_fetch_failed", err);
    return respond(500, { ok: false, reason: "token_unavailable" });
  }

  const authResult = verifyBearer({
    authorizationHeader: headers["authorization"],
    expected: expectedToken,
  });

  if (!authResult.ok) {
    return respond(401, { ok: false, reason: authResult.reason });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return respond(400, { ok: false, reason: "invalid_json" });
  }

  const validated = eventSchema.safeParse(parsed);
  if (!validated.success) {
    return respond(400, {
      ok: false,
      reason: "schema_validation_failed",
      issues: validated.error.issues,
    });
  }

  const row = toRawEventRow(validated.data);
  const dt = partitionDate(row.occurred_at);
  const key = `raw/dt=${dt}/${row.event_id}-${randomUUID()}.json`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: JSON.stringify(row) + "\n",
        ContentType: "application/x-ndjson",
      }),
    );
  } catch (err) {
    console.error("s3_put_failed", { key, err });
    return respond(500, { ok: false, reason: "s3_put_failed" });
  }

  return respond(200, { ok: true, key });
}

function lowercaseHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string") out[k.toLowerCase()] = v;
  }
  return out;
}
