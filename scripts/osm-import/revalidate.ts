/**
 * Asks the running app to refresh cached pages for a city after an import.
 * Uses REVALIDATE_URL and REVALIDATE_SECRET; skipped (with a hint) when unset.
 */
export async function revalidateCity(cityId: string, citySlug: string): Promise<void> {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    console.log("  (set REVALIDATE_URL and REVALIDATE_SECRET to refresh the app's cache)");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        tags: [`places:city:${cityId}`, "place-categories", "cities", `cities:${citySlug}`],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    console.log(
      response.ok
        ? "▸ App cache refreshed."
        : `  Cache refresh failed (HTTP ${response.status}); pages update within hours.`,
    );
  } catch (error) {
    console.log(
      `  Cache refresh skipped (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}
