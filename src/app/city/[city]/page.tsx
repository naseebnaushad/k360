import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import { getLiveCityBySlug } from "@/features/cities/server";
import { CategoryGrid, NearMeButton, SearchForm } from "@/features/places";
import { getCityCategories } from "@/features/places/server";

type CityParams = Pick<PageProps<"/city/[city]">, "params">;

export default function CityHomePage({ params }: PageProps<"/city/[city]">) {
  return (
    <main>
      <section className="bg-hero-glow">
        <Container className="py-14 sm:py-20 desktop:py-28">
          <Suspense fallback={<HeroSkeleton />}>
            <CityHero params={params} />
          </Suspense>
        </Container>
      </section>

      <Container className="pb-24">
        <h2 className="text-lg font-semibold tracking-tight">Browse by category</h2>
        <div className="mt-5">
          <Suspense fallback={<GridSkeleton />}>
            <CityCategories params={params} />
          </Suspense>
        </div>
      </Container>
    </main>
  );
}

async function CityHero({ params }: CityParams) {
  const { city: slug } = await params;
  const city = await getLiveCityBySlug(slug);
  if (!city) notFound();

  return (
    <div className="max-w-3xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-sm text-muted backdrop-blur">
        {city.region}
        {city.localName && (
          <>
            <span aria-hidden>·</span>
            <span lang="ml">{city.localName}</span>
          </>
        )}
      </p>
      <h1 className="mt-5 text-5xl font-semibold tracking-tighter text-balance sm:text-6xl desktop:text-7xl">
        Find anything in {city.name}.
      </h1>
      {city.tagline && <p className="mt-4 text-lg text-muted">{city.tagline}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex-1 sm:min-w-[22rem]">
          <SearchForm size="large" id="hero-search" placeholder="Biryani, flowers, pharmacy…" />
        </div>
        <NearMeButton variant="primary" label="Near me" />
      </div>
    </div>
  );
}

async function CityCategories({ params }: CityParams) {
  const { city: slug } = await params;
  const city = await getLiveCityBySlug(slug);
  if (!city) notFound();

  return <CategoryGrid categories={await getCityCategories(city.id)} />;
}

function HeroSkeleton() {
  return (
    <div aria-hidden className="max-w-3xl animate-pulse">
      <div className="h-7 w-40 rounded-full bg-border" />
      <div className="mt-5 h-16 w-full max-w-xl rounded-2xl bg-border" />
      <div className="mt-8 h-14 w-full rounded-full bg-border" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div
      aria-hidden
      className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 desktop:grid-cols-4 desktop:xl:grid-cols-6"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-border" />
      ))}
    </div>
  );
}
