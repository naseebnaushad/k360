# K360

A free, open, community-built guide to every place, shop and service in a city,
starting with Kochi.

- **Places wiki:** anyone can add and improve pages for shops, restaurants and services.
- **Reviews and photos** from the community.
- **"Who sells it?":** search for a product and see which shops carry it, with
  prices and when it was last seen in stock.
- **Multi-city:** each city lives on its own subdomain, run by local volunteer stewards.

Created by **Naseeb Naushad**.

## Tech stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| App      | Next.js (App Router), React, TypeScript, Tailwind |
| Database | Supabase: PostgreSQL, PostGIS, Row Level Security |
| Hosting  | Cloudflare Workers (via OpenNext), Cloudflare R2  |
| Maps     | MapLibre + OpenStreetMap                          |

See [docs/architecture.md](docs/architecture.md) for structure and conventions.

## Getting started

Requirements: Node.js 22+ and a Supabase project.

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run db:link                 # connect the Supabase CLI to your project
npm run db:push                 # apply database migrations
npm run dev
```

Open:

- <http://localhost:3000>: the city list
- <http://kochi.localhost:3000>: the Kochi site

## Scripts

| Command                                  | What it does                                       |
| ---------------------------------------- | -------------------------------------------------- |
| `npm run dev`                            | Start the development server                       |
| `npm run check`                          | Secret scan, lint, types, unit tests, audit        |
| `npm run test:security`                  | Security tests against the database and app        |
| `npm run verify`                         | `check` plus `test:security`                       |
| `npm run format`                         | Format all files                                   |
| `npm run test`                           | Run unit tests                                     |
| `npm run db:new`                         | Create a new database migration                    |
| `npm run db:push`                        | Apply migrations to the linked database            |
| `npm run db:types`                       | Regenerate TypeScript types from the database      |
| `npm run import:osm -- --city <slug>`    | Import places for a city from OpenStreetMap        |
| `npm run import:areas -- --city <slug>`  | Import neighbourhoods and link places to them      |
| `npm run hours:sync -- --city <slug>`    | Refresh "Open now" data after editing hours        |
| `npm run admin:add -- --email <address>` | Let an account review reports (`--remove` revokes) |
| `npm run icons`                          | Regenerate app icons from the site name            |
| `npm run preview`                        | Build and run locally on the Cloudflare runtime    |
| `npm run deploy`                         | Build and deploy to Cloudflare                     |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

- **Code:** [GNU AGPL-3.0](LICENSE), with an attribution requirement. See [NOTICE](NOTICE).
- **Data:** [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Copyright © 2026 Naseeb Naushad.
