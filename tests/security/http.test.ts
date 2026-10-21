import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { testEnv } from "./env";

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

const app = new URL(testEnv.appUrl);
const rootHost = testEnv.rootDomain;
const cityHost = `${testEnv.citySlug}.${rootHost}`;

/** Sends a request to the app with an arbitrary Host header (fetch() cannot spoof it). */
function send(host: string, path: string, method = "GET"): Promise<Reply> {
  const request = app.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: app.hostname,
        port: app.port,
        path,
        method,
        headers: { host },
        servername: host.split(":")[0],
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error(`Timed out: ${host}${path}`)));
    req.end();
  });
}

/** Next.js renders not-found pages that stream after the response has started with 200 + noindex. */
function isNotFound(reply: Reply) {
  return reply.status === 404 || /<meta name="robots" content="noindex"/.test(reply.body);
}

let placeSlug = "";

beforeAll(async () => {
  try {
    await send(rootHost, "/");
  } catch (error) {
    throw new Error(`The app is not reachable at ${testEnv.appUrl}. Start it with "npm run dev".`, {
      cause: error,
    });
  }
  const anon = createClient(testEnv.supabaseUrl, testEnv.publishableKey, {
    auth: { persistSession: false },
  });
  const { data } = await anon.from("places").select("slug").limit(1).single();
  placeSlug = data?.slug ?? "";
});

describe("security headers", () => {
  it.each([
    ["root", rootHost, "/"],
    ["city", cityHost, "/"],
    ["places list", cityHost, "/places"],
  ])("are sent on the %s page", async (_name, host, path) => {
    const { status, headers } = await send(host, path);
    expect(status).toBe(200);
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

describe("host routing", () => {
  it.each([
    "evil.example",
    `${testEnv.citySlug}.evil.example`,
    `${rootHost}.evil.example`,
    `a.${cityHost}`,
    `-bad-.${rootHost}`,
    `UPPER_CASE.${rootHost}`,
    `127.0.0.1${app.port ? `:${app.port}` : ""}`,
  ])("rejects the host %j", async (host) => {
    expect((await send(host, "/")).status).toBe(404);
  });

  it("returns 404 for a city that does not exist", async () => {
    expect(isNotFound(await send(`no-such-city-xyz.${rootHost}`, "/"))).toBe(true);
  });

  it("does not expose the internal /city route on any host", async () => {
    for (const path of ["", "/places", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"]) {
      expect((await send(rootHost, `/city/${testEnv.citySlug}${path}`)).status, path).toBe(404);
    }
    expect(isNotFound(await send(cityHost, `/city/${testEnv.citySlug}`))).toBe(true);
  });
});

describe("injection", () => {
  // Each payload, and the markup that would mean it was rendered unescaped.
  const payloads: [payload: string, dangerous: string][] = [
    ["<script>alert(1337)</script>", "<script>alert(1337)"],
    ['"><img src=x onerror=alert(1337)>', "<img src=x onerror"],
    ["javascript:alert(1337)", 'href="javascript:'],
    ["' OR '1'='1", "<b>' OR"], // SQL: must simply not error; marker never matches.
  ];

  it.each(payloads)("does not inject %j from query parameters", async (payload, dangerous) => {
    const q = encodeURIComponent(payload);
    for (const param of ["category", "page", "q", "near", "radius", "has", "sort"]) {
      const path = `/places?${param}=${q}&near=9.98,76.29`;
      const reply = await send(cityHost, path);
      expect(reply.status, path).toBe(200);
      expect(reply.body, path).not.toContain(dangerous);
    }
  });

  it.each(payloads)("does not inject %j from the URL path", async (payload, dangerous) => {
    const reply = await send(cityHost, `/places/${encodeURIComponent(payload)}`);
    expect(reply.status).toBeLessThan(500);
    expect(reply.body).not.toContain(dangerous);
    expect(isNotFound(reply)).toBe(true);
  });

  it.each([
    "/places/..%2f..%2f..%2fetc%2fpasswd",
    "/places/%00",
    `/places?page=${"9".repeat(400)}`,
    `/places?category=${"a".repeat(5000)}`,
    "/places?page=-1&page=2&category[]=x",
  ])("handles malformed input %s without crashing", async (path) => {
    const reply = await send(cityHost, path);
    expect(reply.status).toBeLessThan(500);
    expect(reply.body).not.toContain("root:x:0:0");
  });
});

describe("SEO files", () => {
  it("serves a robots.txt and sitemap for each host", async () => {
    for (const host of [rootHost, cityHost]) {
      const robots = await send(host, "/robots.txt");
      expect(robots.status).toBe(200);
      expect(robots.body).toContain(`Sitemap: ${app.protocol}//${host}/sitemap.xml`);
      const sitemap = await send(host, "/sitemap.xml");
      expect(sitemap.status).toBe(200);
      expect(sitemap.headers["content-type"]).toContain("application/xml");
    }
  });

  it("only lists URLs on the requesting city's own host", async () => {
    const { body } = await send(cityHost, "/sitemap.xml");
    const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]!));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.host === cityHost)).toBe(true);
  });

  it("returns 404 for unknown hosts", async () => {
    expect((await send("evil.example", "/sitemap.xml")).status).toBe(404);
    expect((await send(`no-such-city-xyz.${rootHost}`, "/robots.txt")).status).toBe(404);
  });
});

describe("app manifest", () => {
  it("serves an installable manifest for each host", async () => {
    for (const host of [rootHost, cityHost]) {
      const reply = await send(host, "/manifest.webmanifest");
      expect(reply.status).toBe(200);
      expect(reply.headers["content-type"]).toContain("application/manifest+json");
      const manifest = JSON.parse(reply.body) as { start_url: string; icons: unknown[] };
      expect(manifest.start_url).toBe("/");
      expect(manifest.icons.length).toBeGreaterThan(0);
    }
  });

  it("returns 404 for unknown hosts", async () => {
    expect((await send("evil.example", "/manifest.webmanifest")).status).toBe(404);
    expect((await send(`no-such-city-xyz.${rootHost}`, "/manifest.webmanifest")).status).toBe(404);
  });
});

describe("cache refresh endpoint", () => {
  const path = "/api/revalidate";

  it("rejects requests without the secret", async () => {
    // 404 when the endpoint is disabled (no secret configured), 401 otherwise.
    for (const method of ["POST", "PUT", "DELETE"]) {
      expect([401, 404, 405]).toContain((await send(rootHost, path, method)).status);
    }
  });

  it("is not reachable on city hosts", async () => {
    expect(isNotFound(await send(cityHost, path, "POST"))).toBe(true);
  });

  it("does not respond to GET", async () => {
    expect([404, 405]).toContain((await send(rootHost, path)).status);
  });
});

describe("information leaks", () => {
  it("does not send keys or internal errors to the browser", async () => {
    const pages = ["/", "/places", placeSlug ? `/places/${placeSlug}` : "/places"];
    for (const path of pages) {
      const { body } = await send(cityHost, path);
      expect(body, path).not.toMatch(/sb_secret_/);
      expect(body, path).not.toContain(testEnv.publishableKey);
    }
  });

  // Development servers include component stacks on purpose; production must not.
  it.skipIf(!testEnv.production)("does not include stack traces or file paths", async () => {
    for (const path of ["/places", "/places/this-place-does-not-exist"]) {
      const { body } = await send(cityHost, path);
      expect(body, path).not.toMatch(/at \S+ \((?:\/|file:).+:\d+:\d+\)/);
      expect(body, path).not.toContain(process.cwd());
    }
  });

  it("marks missing pages as not indexable", async () => {
    expect(isNotFound(await send(cityHost, "/places/this-place-does-not-exist"))).toBe(true);
  });

  it.each(["/.env", "/.env.local", "/.git/config", "/supabase/.temp/project-ref", "/package.json"])(
    "does not serve %s",
    async (path) => {
      const reply = await send(cityHost, path);
      expect(reply.status).toBeGreaterThanOrEqual(400);
      expect(reply.body).not.toMatch(/SUPABASE|\[core\]|"dependencies"/);
    },
  );
});
