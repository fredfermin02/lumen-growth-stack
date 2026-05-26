import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "missing_authorization" | "malformed" | "mismatch" };

/**
 * Compare a presented bearer token against the configured secret.
 * Uses constant-time comparison so we don't leak length/match info via timing.
 */
export function verifyBearer(args: {
  authorizationHeader: string | undefined;
  expected: string;
}): AuthResult {
  const { authorizationHeader, expected } = args;

  if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    return { ok: false, reason: "missing_authorization" };
  }

  const presented = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  if (presented.length === 0) {
    return { ok: false, reason: "malformed" };
  }

  // Pad shorter buffer to expected length so timingSafeEqual doesn't throw.
  // If lengths differ we already know it's a mismatch, but we still compare
  // (against a padded buffer) to keep total time constant per request.
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  const maxLen = Math.max(a.length, b.length);
  const aPadded = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
  const bPadded = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);

  const equal = timingSafeEqual(aPadded, bPadded) && a.length === b.length;
  return equal ? { ok: true } : { ok: false, reason: "mismatch" };
}
