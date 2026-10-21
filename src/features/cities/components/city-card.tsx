import { ArrowUpRight } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cityUrl } from "@/lib/hosts";

import type { City } from "../types";

export function CityCard({ city }: { city: City }) {
  return (
    <a
      href={cityUrl(city.slug, "/", siteConfig.rootDomain)}
      className="group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div aria-hidden className="bg-hero-glow absolute inset-0 opacity-70" />
      <ArrowUpRight
        aria-hidden
        className="absolute top-5 right-5 size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
      />
      <div className="relative">
        <p className="text-sm text-muted">{city.region}</p>
        <h3 className="mt-1 text-3xl font-semibold tracking-tight">{city.name}</h3>
        {city.localName && (
          <p lang="ml" className="mt-0.5 text-muted">
            {city.localName}
          </p>
        )}
      </div>
    </a>
  );
}
