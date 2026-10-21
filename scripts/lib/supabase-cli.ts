import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Extracts the useful part of a failed CLI call (the CLI prints errors to stdout). */
function describeFailure(error: unknown): string {
  const {
    stdout = "",
    stderr = "",
    message = String(error),
  } = error as {
    stdout?: string;
    stderr?: string;
    message?: string;
  };
  const output = `${stdout}\n${stderr}`
    .split("\n")
    .filter((line) => line.trim() && !/^Initialising login role|^npm notice/.test(line))
    .join("\n")
    .trim();
  return (output || message).slice(0, 2000);
}

/** Errors worth retrying: network blips and pooler hiccups, not SQL errors. */
const isTransient = (detail: string) =>
  /timeout|timed out|ECONNRESET|ENOTFOUND|EAI_AGAIN|connection (refused|reset|closed)|too many connections|502|503|504/i.test(
    detail,
  );

/**
 * Runs SQL against the linked Supabase project through the Supabase CLI
 * (`npx supabase login` + `npm run db:link` first). No database password or
 * secret key is ever stored by the project.
 */
export async function queryLinked<T>(sql: string): Promise<T[]> {
  const dir = await mkdtemp(join(tmpdir(), "supabase-query-"));
  const file = join(dir, "query.sql");
  try {
    await writeFile(file, sql, "utf8");
    for (let attempt = 1; ; attempt++) {
      try {
        return await runFile<T>(file);
      } catch (error) {
        const detail = describeFailure(error);
        if (attempt >= 3 || !isTransient(detail))
          throw new Error(`Database query failed:\n${detail}`);
        await sleep(attempt * 5_000);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runFile<T>(file: string): Promise<T[]> {
  const { stdout } = await run(
    "npx",
    ["supabase", "db", "query", "--linked", "--agent", "no", "--output-format", "json", "-f", file],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  const start = stdout.indexOf("[");
  return start === -1 ? [] : (JSON.parse(stdout.slice(start)) as T[]);
}

/** Embeds JSON as a dollar-quoted literal with a random tag, so data can never break out. */
export function jsonLiteral(value: unknown): string {
  const json = JSON.stringify(value);
  let tag: string;
  do tag = `j${randomBytes(6).toString("hex")}`;
  while (json.includes(`$${tag}$`));
  return `$${tag}$${json}$${tag}$::jsonb`;
}
