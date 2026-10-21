export type CityStatus = "draft" | "live" | "archived";

export interface City {
  id: string;
  /** URL-safe id, also the subdomain: "kochi" → kochi.<root domain> */
  slug: string;
  name: string;
  /** Name in the local script, e.g. "കൊച്ചി". */
  localName: string | null;
  /** Local slogan shown on the city home page. */
  tagline: string | null;
  region: string;
  /** ISO 3166-1 alpha-2, e.g. "IN". */
  countryCode: string;
  /** BCP-47 language codes, primary first. */
  languages: string[];
  /** IANA time zone, e.g. "Asia/Kolkata"; opening hours are in this zone. */
  timeZone: string;
  map: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  status: CityStatus;
}
