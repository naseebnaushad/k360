import { describe, expect, it } from "vitest";

import { isForbiddenFile, scanContent } from "./secret-rules";

// Fake values are assembled at runtime so this file never matches the scanner itself.
const fake = (...parts: string[]) => parts.join("");

describe("scanContent", () => {
  it.each([
    ["Supabase secret key", fake("KEY=sb_", "secret_", "abcdefghijklmnop")],
    ["Private key block", fake("-----BEGIN ", "PRIVATE KEY-----")],
    [
      "JSON Web Token",
      fake("eyJ", "hbGciOiJIUzI1NiJ9", ".eyJ", "yb2xlIjoic2VydmljZSJ9", ".abcdefghijklmnop"),
    ],
    ["Postgres URL with password", fake("postgres://", "postgres:hunter2@", "db.example.com")],
    ["GitHub token", fake("ghp", "_", "a".repeat(36))],
  ])("detects a %s", (rule, line) => {
    expect(scanContent("f.ts", `ok\n${line}\n`)).toEqual([{ file: "f.ts", line: 2, rule }]);
  });

  it("allows the public key and placeholders", () => {
    const content = [
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_abc123"',
      'NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"',
      "postgres://localhost:5432/postgres",
    ].join("\n");
    expect(scanContent("f", content)).toEqual([]);
  });
});

describe("isForbiddenFile", () => {
  it.each([".env", ".env.local", "apps/web/.env.production", ".dev.vars", "certs/server.key"])(
    "forbids %s",
    (path) => expect(isForbiddenFile(path)).toBe(true),
  );

  it.each([".env.example", "src/config/env.ts", "docs/keys.md"])("allows %s", (path) =>
    expect(isForbiddenFile(path)).toBe(false),
  );
});
