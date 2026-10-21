/**
 * Rules for the repository secret scan (see scan-secrets.ts).
 * Kept separate from the scanner so they can be unit-tested.
 */

export interface Finding {
  file: string;
  line: number;
  rule: string;
}

interface ContentRule {
  name: string;
  pattern: RegExp;
}

/** Patterns that must never appear in a committed file. */
export const CONTENT_RULES: ContentRule[] = [
  { name: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "Private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  // Legacy Supabase service-role keys and other signed tokens are JWTs.
  {
    name: "JSON Web Token",
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    name: "Postgres URL with password",
    pattern: /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/,
  },
  { name: "Cloudflare API token", pattern: /CLOUDFLARE_API_TOKEN\s*=\s*["']?[A-Za-z0-9_-]{30,}/ },
  { name: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

/** Files that hold local secrets and must stay out of the repository. */
const FORBIDDEN_FILE_PATTERNS: RegExp[] = [
  /(^|\/)\.env(?!\.example$)(\..+)?$/,
  /(^|\/)\.dev\.vars$/,
  /\.(pem|key|p12|pfx)$/,
  /(^|\/)supabase\/\.temp\//,
];

export function isForbiddenFile(path: string): boolean {
  return FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(path));
}

export function scanContent(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");
  lines.forEach((text, index) => {
    for (const rule of CONTENT_RULES) {
      if (rule.pattern.test(text)) findings.push({ file, line: index + 1, rule: rule.name });
    }
  });
  return findings;
}
