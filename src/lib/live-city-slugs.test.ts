import { describe, expect, it, vi } from "vitest";

import { createLiveSlugGate } from "./live-city-slugs";

describe("createLiveSlugGate", () => {
  it("accepts live slugs and rejects unknown ones", async () => {
    const isLive = createLiveSlugGate(async () => ["kochi"], 60_000);
    expect(await isLive("kochi")).toBe(true);
    expect(await isLive("nope")).toBe(false);
  });

  it("reuses the list until it expires, then reloads it", async () => {
    let time = 0;
    const load = vi.fn(async () => ["kochi"]);
    const isLive = createLiveSlugGate(load, 1_000, () => time);

    await isLive("kochi");
    await isLive("other");
    expect(load).toHaveBeenCalledTimes(1);

    time = 1_001;
    await isLive("kochi");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one lookup between concurrent requests", async () => {
    const load = vi.fn(async () => ["kochi"]);
    const isLive = createLiveSlugGate(load, 60_000);
    await Promise.all([isLive("a"), isLive("b"), isLive("c")]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("fails open when the list cannot be loaded", async () => {
    const isLive = createLiveSlugGate(async () => {
      throw new Error("db down");
    }, 60_000);
    expect(await isLive("anything")).toBe(true);
  });
});
