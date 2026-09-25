import { describe, it, expect } from "vitest";
import { bearerToken, isAuthorized, secretsMatch } from "./auth";

describe("bearerToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
    expect(bearerToken("bearer  spaced-token ")).toBe("spaced-token");
  });

  it("returns null for missing or malformed headers", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
  });
});

describe("secretsMatch", () => {
  it("is true only for equal strings", () => {
    expect(secretsMatch("s3cret", "s3cret")).toBe(true);
    expect(secretsMatch("s3cret", "s3creT")).toBe(false);
    expect(secretsMatch("short", "a-much-longer-secret")).toBe(false);
  });
});

describe("isAuthorized", () => {
  const secret = "top-secret-value";

  it("authorizes a correct Bearer token", () => {
    expect(isAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects a wrong or missing token", () => {
    expect(isAuthorized("Bearer wrong", secret)).toBe(false);
    expect(isAuthorized(null, secret)).toBe(false);
    expect(isAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    expect(isAuthorized("Bearer anything", "")).toBe(false);
    expect(isAuthorized("Bearer ", "")).toBe(false);
  });
});
