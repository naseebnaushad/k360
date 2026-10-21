# Contributing

Thanks for helping build this project.

## Before you start

1. Read [docs/architecture.md](docs/architecture.md). Pull requests that break
   its rules will be asked to change.
2. For anything larger than a small fix, open an issue first to discuss it.

## Workflow

1. Fork the repository and create a branch: `git checkout -b feature/short-name`.
2. Make your change, including tests for logic in `src/lib` and `server/` code.
3. Run `npm run check` and make sure it passes. With `npm run dev` running,
   also run `npm run test:security` (or `npm run verify` for both). See
   [Security testing](docs/architecture.md#security-testing).
4. Database changes: add a migration with `npm run db:new <name>`, never edit an
   existing migration, and regenerate types with `npm run db:types`.
5. Open a pull request describing what changed and why.

## Code style

- TypeScript strict mode; no `any` without a comment explaining why.
- Formatting is handled by Prettier (`npm run format`).
- Keep pages in `src/app` thin; put logic in `src/features/<name>`.
- No hard-coded configuration; add environment variables to
  `src/config/env.ts` and `.env.example`.

## Licensing of contributions

By submitting a contribution you agree that:

1. It is your own work and you have the right to submit it.
2. It is licensed under the project's license (AGPL-3.0, see `LICENSE` and `NOTICE`).
3. You grant Naseeb Naushad a perpetual, worldwide, non-exclusive, royalty-free,
   irrevocable license to use, modify, sublicense and relicense your
   contribution as part of this project.
