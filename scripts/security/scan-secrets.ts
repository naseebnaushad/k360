/**
 * Fails when a file that would be committed contains a secret, or when a
 * local secrets file (such as .env.local) is not ignored by git.
 *
 *   npm run security:secrets
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { type Finding, isForbiddenFile, scanContent } from "./secret-rules.ts";

const BINARY_EXTENSIONS = /\.(ico|png|jpe?g|gif|webp|avif|woff2?|ttf|otf|pdf|zip|gz)$/i;
const SELF = /^scripts\/security\/(secret-rules|scan-secrets)(\.test)?\.ts$/;

// Tracked files plus untracked files that git would pick up (i.e. not ignored).
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const findings: Finding[] = [];

for (const file of files) {
  if (isForbiddenFile(file)) {
    findings.push({ file, line: 0, rule: "Secrets file is not git-ignored" });
    continue;
  }
  if (BINARY_EXTENSIONS.test(file) || SELF.test(file)) continue;

  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue; // Deleted from the working tree but still in the index.
  }
  findings.push(...scanContent(file, content));
}

if (findings.length > 0) {
  console.error(`✗ Secret scan found ${findings.length} problem(s):`);
  for (const { file, line, rule } of findings) {
    console.error(`  ${file}${line ? `:${line}` : ""}  ${rule}`);
  }
  process.exit(1);
}

console.log(`✓ Secret scan: ${files.length} files clean.`);
