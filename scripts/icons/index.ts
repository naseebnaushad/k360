/**
 * Generates the app icons in public/icons from the site name and brand colour,
 * so renaming the site only needs a re-run:
 *
 *   npm run icons
 *
 * Requires `rsvg-convert` (librsvg) on the machine running it. The output is
 * committed, so builds and deploys do not need it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { brandColors } from "../../src/config/brand.ts";

const OUT_DIR = join(import.meta.dirname, "../../public/icons");

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A rounded square with the site's initial. `maskable` keeps the letter inside the safe zone. */
function iconSvg(letter: string, { maskable = false } = {}) {
  const radius = maskable ? 0 : 112;
  const fontSize = maskable ? 220 : 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${brandColors.accent}"/>
  <text x="256" y="256" dy="0.35em" text-anchor="middle" font-family="Inter, Geist, 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${brandColors.accentForeground}">${escapeXml(letter)}</text>
</svg>
`;
}

function render(svgPath: string, size: number, out: string) {
  execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-o", out, svgPath]);
}

const name = process.env.NEXT_PUBLIC_SITE_NAME;
if (!name) throw new Error("NEXT_PUBLIC_SITE_NAME is not set (see .env.example).");
const letter = [...name.trim()][0]?.toUpperCase() ?? "?";

mkdirSync(OUT_DIR, { recursive: true });
const svg = join(OUT_DIR, "icon.svg");
const scratch = mkdtempSync(join(tmpdir(), "icons-"));
const maskable = join(scratch, "maskable.svg");
writeFileSync(svg, iconSvg(letter));
writeFileSync(maskable, iconSvg(letter, { maskable: true }));

render(svg, 192, join(OUT_DIR, "icon-192.png"));
render(svg, 512, join(OUT_DIR, "icon-512.png"));
render(maskable, 512, join(OUT_DIR, "maskable-512.png"));
render(maskable, 180, join(OUT_DIR, "apple-touch-icon.png"));
rmSync(scratch, { recursive: true, force: true });
console.log(`✔ Icons written to public/icons for "${name}".`);
