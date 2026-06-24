# AGENTS.md

izinet-api is a Node.js/Express bridge that connects ProxyPay (Angolan payment processor, Multicaixa/ATM) with Splynx (ISP billing platform). It automates payment reference creation and payment processing.

## Stack

- Node.js >= 22, TypeScript (strict), Express 4
- Knex + mysql2 (MySQL)
- Zod for validation, Vitest for tests
- pnpm for package management, cross-env for env vars

## Commands

- see `package.json` scripts section for dev, build, start, test

## Structure

- `index.ts` — Express app, routes, middleware
- `src/config` — env, db, http client, Splynx/ProxyPay clients, auth
- `src/controller` — request handlers
- `src/services` — business logic
- `src/repositories` — DB access
- `src/models` — domain types

## Conventions

- Validate env via Zod in `src/config/env.ts`; app fails fast if invalid.
- Never log secrets or PII; use the `logger` with a `correlation_id`.
- Isolate per-item failures in batch loops; one bad record must not abort the batch.
- Confirm external side effects (Splynx) before recording locally.
- Protect routes with `checkRoutePass` (`x-api-pass` header); verify webhook signatures.

## Notes

- Do not commit `.env`.
