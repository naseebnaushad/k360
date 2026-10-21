/**
 * HTTP security headers applied to every response (wired up in next.config.ts).
 * Allowed origins are derived from configuration; add new third-party
 * origins through `extraOrigins` rather than editing the policy inline.
 */

interface SecurityHeaderOptions {
  isDev: boolean;
  supabaseUrl: string;
  extraOrigins?: {
    connect?: string[];
    img?: string[];
  };
}

export function buildSecurityHeaders({
  isDev,
  supabaseUrl,
  extraOrigins = {},
}: SecurityHeaderOptions) {
  const supabase = new URL(supabaseUrl);
  const supabaseHttp = supabase.origin;
  const supabaseWs = `wss://${supabase.host}`;

  const csp: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js injects inline bootstrap scripts; nonces would force every page
    // to render dynamically, so inline is allowed until that trade-off changes.
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseHttp, ...(extraOrigins.img ?? [])],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabaseHttp, supabaseWs, ...(extraOrigins.connect ?? [])],
    // The map renderer runs its tile decoding in blob: web workers.
    "worker-src": ["'self'", "blob:"],
    "child-src": ["blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };

  const cspValue = Object.entries(csp)
    .map(([directive, sources]) => [directive, ...sources].join(" "))
    .join("; ");

  return [
    { key: "Content-Security-Policy", value: cspValue },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self), payment=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(isDev
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]),
  ];
}
