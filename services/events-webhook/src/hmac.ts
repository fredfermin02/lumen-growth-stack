import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 5 * 60 * 1000;
const SIGNATURE_PREFIX = "sha256=";

export type HmacVerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing_signature" | "missing_timestamp" | "stale" | "mismatch" | "malformed" };

export function verifyHmac(args: {
  signatureHeader: string | undefined;
  timestampHeader: string | undefined;
  body: string;
  secret: string;
  now?: number;
}): HmacVerifyResult {
  const { signatureHeader, timestampHeader, body, secret } = args;
  const now = args.now ?? Date.now();

  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return { ok: false, reason: "missing_signature" };
  }
  if (!timestampHeader) {
    return { ok: false, reason: "missing_timestamp" };
  }

  const timestampMs = Number(timestampHeader);
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: "malformed" };
  }
  if (Math.abs(now - timestampMs) > MAX_AGE_MS) {
    return { ok: false, reason: "stale" };
  }

  const provided = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const computed = createHmac("sha256", secret)
    .update(`${timestampMs}.${body}`)
    .digest("hex");

  if (provided.length !== computed.length) {
    return { ok: false, reason: "mismatch" };
  }

  try {
    const matches = timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(computed, "hex"),
    );
    return matches ? { ok: true } : { ok: false, reason: "mismatch" };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
