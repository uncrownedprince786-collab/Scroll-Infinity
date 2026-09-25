// Bearer-token auth for internal endpoints (the ingest trigger, spec sec. 41).
// The comparison is constant-time and length-independent: both sides are hashed
// to a fixed-width digest first, so neither the secret's length nor its content
// leaks through timing. An empty configured secret never authorizes — a
// misconfigured deployment fails closed rather than open.

import { createHash, timingSafeEqual } from "node:crypto";

/** Extract the token from an `Authorization: Bearer <token>` header. */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time string equality that does not reveal length. */
export function secretsMatch(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * True only when the request carries a Bearer token equal to `secret` and
 * `secret` is non-empty. A blank secret (unset env) always denies.
 */
export function isAuthorized(authHeader: string | null | undefined, secret: string): boolean {
  if (!secret) return false;
  const token = bearerToken(authHeader);
  if (!token) return false;
  return secretsMatch(token, secret);
}
