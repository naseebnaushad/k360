import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import { getLiveCityBySlug } from "@/features/cities/server";
import { EmergencyNumbers } from "@/features/emergency";
import { getEmergencyContacts } from "@/features/emergency/server";
import { NearMeButton, PlaceCard } from "@/features/places";
import { getAlwaysOpenPlaces } from "@/features/places/server";

type Props = PageProps<"/city/[city]/emergency">;

/** Categories searched for "help nearby" and the 24-hour list. Slugs from place_categories. */
const HOSPITALS = "healthcare";
const PHARMACIES = "pharmacies";
const POLICE = "police";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getLiveCityBySlug((await params).city);
  return {
    title: "Emergency numbers",
    description: city
      ? `Police, ambulance, fire and the nearest hospitals and pharmacies in ${city.name}.`
      : undefined,
  };
}

export default function EmergencyPage({ params }: Props) {
  return (
    <main>
      <Container className="py-8 sm:py-12">
        <Suspense fallback={<EmergencySkeleton />}>
          <EmergencyContent params={params} />
        </Suspense>
      </Container>
    </main>
  );
}

async function EmergencyContent({ params }: Pick<Props, "params">) {
  const city = await getLiveCityBySlug((await params).city);
  if (!city) notFound();

  const [contacts, alwaysOpen] = await Promise.all([
    getEmergencyContacts(city.id, city.countryCode),
    getAlwaysOpenPlaces(city.id, [HOSPITALS, PHARMACIES]),
  ]);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Emergency</h1>
      <p className="mt-1 mb-6 text-muted">Tap a number to call. Calls to these numbers are free.</p>

      <EmergencyNumbers contacts={contacts} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Help near you</h2>
        <p className="mt-1 text-sm text-muted">
          Uses your location once to sort by distance. It is not stored.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <NearMeButton
            variant="primary"
            label="Nearest hospital"
            filters={{ categories: [HOSPITALS] }}
          />
          <NearMeButton
            variant="primary"
            label="Pharmacy open now"
            filters={{ categories: [PHARMACIES], open: true }}
          />
          <NearMeButton label="Nearest police station" filters={{ categories: [POLICE] }} />
        </div>
      </section>

      {alwaysOpen.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Open 24 hours</h2>
          <p className="mt-1 text-sm text-muted">
            Hours come from community data; call ahead if you can.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 desktop:grid-cols-3">
            {alwaysOpen.map((place) => (
              <li key={place.id}>
                <PlaceCard place={place} timeZone={city.timeZone} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function EmergencySkeleton() {
  return (
    <div aria-hidden className="animate-pulse space-y-3">
      <div className="h-10 w-48 rounded-xl bg-border" />
      <div className="h-28 rounded-3xl bg-border" />
      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-border" />
        ))}
      </div>
    </div>
  );
}
