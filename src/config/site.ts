import { env } from "./env";

/** Site identity, derived entirely from environment configuration. */
export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  tagline: env.NEXT_PUBLIC_SITE_TAGLINE,
  description: env.NEXT_PUBLIC_SITE_DESCRIPTION,
  rootDomain: env.NEXT_PUBLIC_ROOT_DOMAIN,
  creator: {
    name: env.NEXT_PUBLIC_CREATOR_NAME,
    url: env.NEXT_PUBLIC_CREATOR_URL,
  },
  repositoryUrl: env.NEXT_PUBLIC_REPOSITORY_URL,
  mapStyleUrl: env.NEXT_PUBLIC_MAP_STYLE_URL,
} as const;
