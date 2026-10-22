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
Without `.env.local` the app stops with a console error naming the missing `VITE_OIDC_*` variable.

## Using the app
- **Login:** every page needs a signed-in user. Opening any URL redirects to Keycloak, and after login you return to
  that same URL. A 401 from the API starts a new login. Logout ends the Keycloak session.
- **Roles:** `realm_access.roles` in the access token decides what you see. Navigation and routes follow
  `permissions` in `ui-manifest.yaml`. A route you cannot read shows the 403 page.
- **Language:** PL/EN switcher in the header. The choice is stored in `localStorage` (`lang`); the default comes from the
  browser, with Polish as the fallback. The Keycloak login page uses the same language (`ui_locales`).
- **Theme:** light, dark or system in the header, stored in `localStorage` (`theme`).
- **Persons:** a list with search, sorting and paging kept in the URL (a table from 768 px, cards below), a detail page,
  and create/edit forms. Editors also see New, Edit and Delete. Delete asks for confirmation. Leaving a form with unsaved
  changes asks first. If someone else saved the record meanwhile, the form offers to reload it.
- **E2E tests** sign in through the real Keycloak form, so the API stack must be running (`npm run e2e`). Tests delete
  every person they create.

## Adding a resource
`src/features/persons/` is the reference implementation. In short:
1. Add the resource to `ui-manifest.yaml` (route, permissions, list columns, detail fields, form groups) and to
   `ResourceKey` in `src/manifest/index.ts`.
2. Add `src/locales/{pl,en}/<resource>.json` (`title`, `fields.*`, …), any `enums.*` labels, and register them in
   `src/i18n/resources.ts`. `npm test` fails if a label the manifest needs is missing.
3. Copy `src/features/persons/` and swap the generated hooks and schemas (`src/api/generated/`). Then add its routes in
   `src/router.tsx`. The list, table, pagination, search, detail list, form fields, error mapping and guards in
   `src/components/app/` are generic and driven by the manifest.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | `tsc` without emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright tests (needs the API stack; starts the dev server if it is not running) |
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

The current contract is Person API 3.1.1: `PUT` replaces the whole record, so the edit form always sends
every field plus `version`. Each field error in a Problem Details `errors[]` has a stable `code`; the form shows
`common.validation.<code>` in the current language (falling back to the server's English `message` for an unknown code).
A unit test fails if a code in the contract has no translation. `src/api/contract.test.ts` fails if a contract change produces Zod schemas
that JavaScript cannot load (for example a Java-only regex in a `@Pattern`).

## Environment

| Variable | Default (`.env.example`) |
|---|---|
| `VITE_OIDC_AUTHORITY` | `http://localhost:8080/realms/person` |
| `VITE_OIDC_CLIENT_ID` | `person-ui` |
