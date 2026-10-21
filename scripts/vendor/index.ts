/**
 * Copies third-party browser files that cannot be bundled into public/vendor.
 * Runs automatically before `dev` and `build`; the output is git-ignored.
 *
 * MapLibre loads its web worker from a separate file next to its own module,
 * which bundlers do not emit, so the worker is served from here instead
 * (see src/components/map/map-view.tsx). The file name carries the version
 * so browsers never keep an old worker after an upgrade.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../..");
const outDir = join(root, "public/vendor");
const maplibreDir = join(root, "node_modules/maplibre-gl");
const { version } = JSON.parse(readFileSync(join(maplibreDir, "package.json"), "utf8")) as {
  version: string;
};

mkdirSync(outDir, { recursive: true });
const target = `maplibre-gl-worker-${version}.mjs`;
// Remove workers from previous versions.
for (const file of readdirSync(outDir)) {
  if (file.startsWith("maplibre-gl-worker-") && file !== target) rmSync(join(outDir, file));
}
copyFileSync(join(maplibreDir, "dist/maplibre-gl-worker.mjs"), join(outDir, target));
console.log(`✔ public/vendor/${target}`);
