# Person UI

Web UI for the Person API ([`spring-person-api-claude`](../spring-person-api-claude)).
It is also the reference implementation of a reusable CRUD UI blueprint; see `CLAUDE.md` for the
conventions and `ui-manifest.yaml` for the per-resource UI decisions.

Stack: Vite, React, TypeScript (strict), React Router, Tailwind CSS v4, shadcn/ui,
Vitest + Testing Library, Playwright.

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
| `npm run contract:pull` | Copy the OpenAPI contract from the API repo (stub until stage 2) |
| `npm run api:generate` | Regenerate `src/api/generated/` (stub until stage 2) |

## Environment

| Variable | Default (`.env.example`) |
|---|---|
| `VITE_OIDC_AUTHORITY` | `http://localhost:8080/realms/person` |
| `VITE_OIDC_CLIENT_ID` | `person-ui` |
