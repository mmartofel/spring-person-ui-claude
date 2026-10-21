# Build prompts

Run the stages in order, one Claude Code session per stage (or `/clear` between them).
Each stage ends with a commit. Review the result yourself before starting the next stage:
stage 4 in particular becomes the pattern for every future resource.

---

## Stage 0 - API fixes (run in the `spring-person-api-claude` repo)

```
Prepare the Person API for the Web UI. Use plan mode.

1. PUT /api/persons/{id} becomes a full replacement instead of a partial merge.
   PersonUpdateRequest has the same fields and constraints as PersonCreateRequest plus the
   required `version`. Optional fields sent as null (birthDate, gender) are cleared.
   Keep the optimistic locking check. Update tasks/lessons.md: the old rule "PUT merges
   non-null fields" is replaced by "PUT replaces the record; the UI form always sends all fields".
2. Responses are documented as application/json instead of */*
   (springdoc.default-produces-media-type).
3. In the contract, PersonResponse marks id, firstName, lastName, email and version as required
   (@Schema requiredMode REQUIRED); birthDate and gender stay optional.
4. Keycloak realm (k8s/realm.json): enable internationalization with supported locales en and pl,
   default en, so the login page follows the UI language (ui_locales).

Update tests (positive and negative, including clearing birthDate via PUT), README, CLAUDE.md
(the PUT rule in "API contract"), and regenerate contract/openapi.json with mvn verify.
This changes PUT semantics, so bump the version according to the versioning rule in CLAUDE.md.
```

---

## Stage 1 - Scaffold

```
Read CLAUDE.md and ui-manifest.yaml. Use plan mode.

Scaffold the app in this repo (keep the existing CLAUDE.md, ui-manifest.yaml, .mcp.json,
.claude/ and tasks/): Vite + React + TypeScript (strict), Tailwind CSS, shadcn/ui (init with
CSS variables, light and dark theme), ESLint, Vitest + Testing Library, Playwright.
Use the latest stable versions and check their current docs for setup.

- Vite dev server: port 5173 with strictPort; proxy /api to http://localhost:8081.
- npm scripts exactly as listed in CLAUDE.md "Commands" (contract:pull and api:generate can be
  stubs that print "configured in stage 2").
- .env.example with VITE_OIDC_AUTHORITY=http://localhost:8080/realms/person and
  VITE_OIDC_CLIENT_ID=person-ui; .env.local in .gitignore.
- Folder structure from CLAUDE.md "Repository map", with a placeholder home page.
- README: prerequisites, how to start the API stack and the UI.

Done when typecheck, lint, test and build pass and the placeholder page renders
(check it with the Playwright MCP server).
```

---

## Stage 2 - API client from the contract

```
Read CLAUDE.md. Use plan mode.

1. contract:pull copies contract/openapi.json from the API repo. Source is configurable:
   CONTRACT_SOURCE env var, either a local path (default ../spring-person-api-claude/contract/openapi.json)
   or a URL (e.g. a raw GitHub URL pinned to a tag). Pull it now and commit it.
2. orval config: React Query hooks (tags-split) into src/api/generated/ and Zod schemas from the
   same contract. api:generate runs orval. Generated files are committed and excluded from lint.
3. src/api/fetcher.ts is the orval mutator and the only HTTP client:
   relative URLs, Authorization: Bearer <access token> from the OIDC user (inject a token getter;
   auth arrives in stage 3), JSON handling, and non-2xx responses thrown as a typed ApiError
   { status, title, detail, errors: {field, message}[] } parsed from Problem Details.
4. Unit tests for fetcher.ts: success, 400 with field errors, 409 without field errors, 401,
   non-JSON error body.
5. Add a CI-friendly check script (contract:check) that runs api:generate and fails if
   src/api/generated changed.

Done when typecheck, lint, tests and build pass.
```

---

## Stage 3 - App shell: auth, i18n, layout

```
Read CLAUDE.md and ui-manifest.yaml. Use plan mode.

1. Auth: react-oidc-context with Keycloak (authorization code + PKCE), automatic silent renew,
   login redirect for unauthenticated users, logout, return to the original URL after login.
   useRoles() reads realm_access.roles from the access token; <RequireRole> guards routes.
   Pass the current language to Keycloak as ui_locales. Wire the token getter into fetcher.ts;
   on 401 trigger a new login.
2. i18n: i18next with pl and en resources in src/locales/{pl,en}/ (common.json plus one file per
   resource), browser detection, fallback pl, choice stored in localStorage, PL/EN switcher in
   the header that also sets <html lang>. One global Zod error map that translates validation
   messages through i18next. Intl-based date formatting helpers.
3. Layout: responsive app shell per CLAUDE.md (sidebar from lg, sheet menu below), navigation
   built from ui-manifest.yaml resources filtered by the user's read permission, header with
   app name, language switcher, theme toggle (light/dark/system) and user menu (name, roles, logout).
   Error boundary, 403 page, 404 page, toast provider (sonner).
4. Shared building blocks in src/components/app/: PageHeader, DataState (loading/empty/error),
   ConfirmDialog. Do not build the data table yet.

Verify with the Playwright MCP server: log in as editor and viewer, switch PL/EN, check
375/768/1440 px. Then run the ui-reviewer agent and fix its findings.
```

---

## Stage 4 - Golden resource: persons

```
Read CLAUDE.md and ui-manifest.yaml (resource "persons"). Use plan mode.
This resource is the reference pattern for all future resources, so keep it clean and generic:
anything not specific to persons goes into src/components/app/ and is driven by the manifest
entry, the generated hooks and the i18n keys.

1. List /persons: TanStack Table from md, cards below md (manifest mobile: primary/secondary/hidden),
   debounced search (q), sortable columns, pagination with page size selector, all list state in
   URL search params, loading/empty/error states, row click opens the detail. "New" button only
   for write permission.
2. Detail /persons/:id: fields from the manifest, formatted per language (dates, enum labels);
   Edit and Delete actions only for write permission; 404 page when the record does not exist.
3. Create /persons/new and edit /persons/:id/edit: one PersonForm component, React Hook Form with
   the generated Zod schema, field groups from the manifest, date input and enum select with an
   empty option. Edit sends the whole record with version (PUT replaces). Server errors[] mapped
   to fields with setError; 409 without field errors shows a dialog to reload the record.
   Success toast and navigation to the detail. Warn before leaving with unsaved changes.
4. Delete: ConfirmDialog naming the person, toast, back to the list, list cache invalidated.
5. Translations for every new key in pl and en.
6. Unit tests for the non-trivial pieces (URL state, error mapping).

Verify per the Definition of Done in CLAUDE.md: Playwright MCP at 375/768/1440, editor and viewer,
PL and EN; then run the ui-reviewer agent and fix its findings.
```

---

## Stage 5 - E2E tests and CI

```
Read CLAUDE.md. Use plan mode.

1. Playwright e2e tests in e2e/ against the running stack, with a login helper (storage state
   per role: editor, viewer). Cover: editor create -> edit -> delete; validation error on create;
   duplicate email shows a field error; stale version conflict (two contexts edit the same record);
   viewer sees no write actions; search and paging update the URL; mobile viewport (375px) list
   shows cards and the menu opens. Tests clean up the data they create.
2. CI (CircleCI, matching the API repo style): typecheck, lint, unit tests, build, contract:check.
   E2E stays local for now; document how to run it in README.

Done when everything passes locally.
```

---

## Stage 6 - Retrospective (input for the blueprint)

```
Write docs/PATTERNS.md for whoever builds the next CRUD UI from this one:
- the exact steps to add a new resource (manifest entry, i18n keys, files to create, which shared
  components to use), with paths to the persons files to copy from;
- every place where persons-specific code had to be written and why;
- problems met during stages 1-5 and how they were solved (also check tasks/lessons.md and git log);
- what in ui-manifest.yaml turned out to be missing or unnecessary.
Keep it factual and short. Do not change code in this stage.
```
