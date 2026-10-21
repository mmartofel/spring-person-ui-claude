# Person UI

Web UI for the Person API ([`spring-person-api-claude`](../spring-person-api-claude)).
It is also the reference implementation of a reusable CRUD UI blueprint; see `CLAUDE.md` for the
conventions and `ui-manifest.yaml` for the per-resource UI decisions.

Stack: Vite, React, TypeScript (strict), React Router, Tailwind CSS v4, shadcn/ui,
TanStack Query, orval (hooks and Zod schemas from the OpenAPI contract), Vitest + Testing Library, Playwright.

## Prerequisites
- Node.js 24+ and npm 11+
- Docker (PostgreSQL and Keycloak for the API stack)
- Java and Maven (to run the API)

## Start the API stack
In the API repo (`../spring-person-api-claude`):

```bash
docker compose up -d     # PostgreSQL :5432, Keycloak :8080
mvn spring-boot:run      # API :8081
```

Demo users: `editor` / `editor` (read and write), `viewer` / `viewer` (read only).

## Start the UI

```bash
cp .env.example .env.local   # OIDC settings; the defaults match the local Keycloak
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev                  # http://localhost:5173
```

The dev server uses port 5173 with `strictPort`, because Keycloak only accepts redirects there.
It proxies `/api` to `http://localhost:8081`, so the app always calls relative URLs.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | `tsc` without emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright tests (starts the dev server if it is not running) |
| `npm run contract:pull` | Copy the OpenAPI contract into `contract/openapi.json` (see below) |
| `npm run api:generate` | Regenerate `src/api/generated/` from the contract with orval |
| `npm run contract:check` | Regenerate and fail if `src/api/generated/` differs from what is committed (for CI) |

## API client

The UI consumes the API contract; it never works around it.

1. `npm run contract:pull` copies the contract. `CONTRACT_SOURCE` picks the source: a local path
   (default `../spring-person-api-claude/contract/openapi.json`) or a URL, for example a raw GitHub URL
   pinned to a tag:
   ```bash
   CONTRACT_SOURCE=https://raw.githubusercontent.com/<owner>/spring-person-api-claude/<tag>/contract/openapi.json npm run contract:pull
   ```
2. `npm run api:generate` runs orval (`orval.config.ts`): React Query hooks and types in
   `src/api/generated/endpoints/<tag>/` and `src/api/generated/model/`, Zod schemas in `*.zod.ts` next to the hooks.
   Generated files are committed and never edited by hand.
3. Every request goes through `src/api/fetcher.ts`: relative URLs, the bearer token, and non-2xx responses
   thrown as `ApiError { status, title, detail, errors[] }` parsed from Problem Details.

The current contract is Person API 3.0.0: `PUT` replaces the whole record, so the edit form always sends
every field plus `version`. `src/api/contract.test.ts` fails if a contract change produces Zod schemas
that JavaScript cannot load (for example a Java-only regex in a `@Pattern`).

## Environment

| Variable | Default (`.env.example`) |
|---|---|
| `VITE_OIDC_AUTHORITY` | `http://localhost:8080/realms/person` |
| `VITE_OIDC_CLIENT_ID` | `person-ui` |
