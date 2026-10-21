import { HeaderLink, SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { CityCard } from "@/features/cities";
import { getLiveCities } from "@/features/cities/server";

export default async function HomePage() {
  const cities = await getLiveCities();

  return (
    <>
      <SiteHeader homeHref="/">
        {siteConfig.repositoryUrl && (
          <HeaderLink href={siteConfig.repositoryUrl} external>
            Source
          </HeaderLink>
        )}
      </SiteHeader>
      <main>
        <section className="bg-hero-glow">
          <Container className="py-20 sm:py-28">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tighter text-balance sm:text-7xl">
              {siteConfig.tagline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted">{siteConfig.description}</p>
          </Container>
        </section>

        <Container className="pb-24">
          <h2 className="text-lg font-semibold tracking-tight">Choose your city</h2>
          {cities.length > 0 ? (
            <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 desktop:grid-cols-3">
              {cities.map((city) => (
                <li key={city.id}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-muted">No cities are live yet.</p>
          )}
        </Container>
      </main>
    </>
  );
}
