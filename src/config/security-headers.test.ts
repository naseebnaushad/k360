import { describe, expect, it } from "vitest";

import { buildSecurityHeaders } from "./security-headers";

const SUPABASE = "https://abc.supabase.co";

function headerMap(isDev: boolean) {
  const headers = buildSecurityHeaders({
    isDev,
    supabaseUrl: SUPABASE,
    extraOrigins: { connect: ["https://tiles.example"], img: ["https://tiles.example"] },
  });
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

function cspDirectives(isDev: boolean) {
  const csp = headerMap(isDev)["Content-Security-Policy"] ?? "";
  return Object.fromEntries(
    csp.split("; ").map((part) => {
      const [name = "", ...sources] = part.split(" ");
      return [name, sources];
    }),
  );
}

describe("buildSecurityHeaders", () => {
  it("blocks framing, plugins, base-tag hijacking and foreign form posts", () => {
    const csp = cspDirectives(false);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["base-uri"]).toEqual(["'self'"]);
    expect(csp["form-action"]).toEqual(["'self'"]);
    expect(csp["default-src"]).toEqual(["'self'"]);
  });

  it("only allows eval in development", () => {
    expect(cspDirectives(false)["script-src"]).not.toContain("'unsafe-eval'");
    expect(cspDirectives(true)["script-src"]).toContain("'unsafe-eval'");
  });

  it("never allows wildcard sources", () => {
    for (const sources of Object.values(cspDirectives(false))) {
      expect(sources).not.toContain("*");
      expect(sources).not.toContain("https:");
      expect(sources).not.toContain("http:");
    }
  });

  it("allows exactly the configured origins to connect", () => {
    expect(cspDirectives(false)["connect-src"]).toEqual([
      "'self'",
      SUPABASE,
      "wss://abc.supabase.co",
      "https://tiles.example",
    ]);
  });

  it("enforces HTTPS in production only", () => {
    expect(headerMap(false)["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(headerMap(true)["Strict-Transport-Security"]).toBeUndefined();
    expect(cspDirectives(false)).toHaveProperty("upgrade-insecure-requests");
  });

  it("sets the standard hardening headers", () => {
    const headers = headerMap(false);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });
});
