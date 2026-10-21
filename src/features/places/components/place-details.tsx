import { Clock, Globe, MapPin, Phone } from "lucide-react";

import type { Place } from "../types";
import { telHref } from "./place-actions";

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-b border-border py-4 last:border-0">
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
    </div>
  );
}

/** Formats OSM opening_hours ("Mo-Fr 09:00-18:00; Sa 10:00-14:00") one rule per line. */
function OpeningHours({ value }: { value: string }) {
  const rules = value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean);
  return (
    <ul className="space-y-0.5">
      {rules.map((rule) => (
        <li key={rule} className="tabular-nums">
          {rule}
        </li>
      ))}
    </ul>
  );
}

export function PlaceDetails({ place }: { place: Place }) {
  const { lat, lng } = place.location;
  const osmUrl = place.osm
    ? `https://www.openstreetmap.org/${place.osm.type}/${place.osm.id}`
    : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

  const hasDetails = place.address || place.phone || place.website || place.openingHours;

  return (
    <div>
      {hasDetails ? (
        <dl className="rounded-3xl border border-border bg-surface px-5 shadow-card">
          {place.address && (
            <DetailRow icon={MapPin} label="Address">
              {place.address}
            </DetailRow>
          )}
          {place.phone && (
            <DetailRow icon={Phone} label="Phone">
              <a href={telHref(place.phone)} className="text-accent hover:underline">
                {place.phone}
              </a>
            </DetailRow>
          )}
          {place.website && (
            <DetailRow icon={Globe} label="Website">
              <a
                href={place.website}
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
              >
                {new URL(place.website).hostname.replace(/^www\./, "")}
              </a>
            </DetailRow>
          )}
          {place.openingHours && (
            <DetailRow icon={Clock} label="Opening hours">
              <OpeningHours value={place.openingHours} />
            </DetailRow>
          )}
        </dl>
      ) : (
        <p className="rounded-3xl border border-dashed border-border-strong p-6 text-sm text-muted">
          No contact details yet. Know this place? Details can be added soon.
        </p>
      )}

      {place.source === "osm" && (
        <p className="mt-3 text-xs text-muted">
          Data ©{" "}
          <a href={osmUrl} className="hover:text-accent" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>{" "}
          contributors, available under the ODbL.
        </p>
      )}
    </div>
  );
}
