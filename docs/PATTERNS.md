# Patterns

For whoever builds the next CRUD UI from this one. `src/features/persons/` is the golden resource: copy it, do not
reinvent it. Conventions are in `CLAUDE.md`; this file records how they were applied and what was learned.

## 1. Adding a resource

Example: a resource `orders` with API tag `Orders`. Steps 1–3 come before any screen code.

1. **Contract.** The API must already expose the resource. `npm run contract:pull && npm run api:generate`, then commit
   `contract/openapi.json` and `src/api/generated/`. Check what the contract gives you:
   - required fields;
   - enums;
   - `format: date`;
   - field error `code`s.
   Anything the UI needs but cannot find there (e.g. a server-only rule like `@Past`) is an API change, not a UI
   workaround.
2. **Manifest** (`ui-manifest.yaml`). Add `resources.orders` with the same keys as `persons`:
   - `route`, `nav` (`icon`, `order`) and `display`;
   - `permissions` (`read`, `write`);
   - `list`: `defaultSort`, `pageSize`, `pageSizes` and `columns` (`field`, `sortable`, `format`, `enum` and `mobile`);
   - `detail.fields`;
   - `form`: `groups` and `fields`.

   Then:
   - add `'orders'` to `ResourceKey` in `src/manifest/index.ts`;
   - add any new `nav.icon` name to `src/manifest/icons.ts`.

   Ask when a decision is missing; do not guess.
3. **i18n.**
   - Create `src/locales/{pl,en}/orders.json` with `title`, `newTitle`, `editTitle` (`{{name}}`), `empty` and `fields.<field>`.
   - Add new enums to `src/locales/{pl,en}/enums.json` as `<EnumName>.<VALUE>`.
   - Register the namespaces in `src/i18n/resources.ts`.

   `src/i18n/locales.test.ts` fails if a label the manifest needs, an enum, or a PL/EN key is missing.
4. **Feature folder.** Copy `src/features/persons/` to `src/features/orders/`, then rename:
   - the generated hooks (`useListOrders`, `useGetOrder`, `useCreateOrder`, `useUpdateOrder`, `useDeleteOrder`);
   - the query key getters (`getListOrdersQueryKey`, `getGetOrderQueryKey`);
   - the Zod bodies (`CreateOrderBody`, `UpdateOrderBody`);
   - the enum consts used for `enumValues`;
   - `getResource('orders')`.

   | File | What it wires |
   |---|---|
   | `routes.tsx` | lazy routes; `RequireRole` with `permissions.read` around everything, `permissions.write` around `new` and `:id/edit` |
   | `PersonsListPage.tsx` | `useListState` → generated list hook (`keepPreviousData`) → `SearchInput`, `DataTable`, `Pagination` inside `DataState`; `clampPage` effect; New button if `canWrite` |
   | `PersonDetailPage.tsx` | `useIdParam` (bad id → 404), `errorPageFor` (403/404), `DetailList`, Edit/Delete if `canWrite`, `ConfirmDialog` naming the record, cache update and toast, a 404 on delete counts as success |
   | `PersonFormPage.tsx` | create and edit pages around `ResourceForm`; edit uses `UpdateBody.omit({ version: true })` and sends `version` from `ResourceForm` |
5. **Router.** Spread `ordersRoutes` into the root children in `src/router.tsx`, before the `*` route.
6. **Tests.** Copy the relevant cases from `e2e/persons.spec.ts`:
   - use `test.use({ storageState: authFile('editor') })` and `openAs`;
   - create data through the API with a unique tag;
   - cleanup runs in `afterEach`.

   Add unit tests only for new generic code.
7. **Definition of Done** (`CLAUDE.md`):
   - checks;
   - Playwright MCP at 375/768/1440 px, editor and viewer, PL and EN;
   - the `ui-reviewer` agent;
   - e2e;
   - README.

### Shared pieces (use, do not copy)

| Need | Use |
|---|---|
| Page title + actions | `components/app/PageHeader` (also sets `document.title`) |
| Loading / empty / error with retry | `components/app/DataState`, `list/ListSkeleton` |
| 403/404 from a query error | `components/app/errorPageFor` |
| URL list state, back-to-list link | `list/listState` (`useListState`, `useListHref`) |
| Search, table/cards, paging | `list/SearchInput`, `list/DataTable`, `list/Pagination` |
| Detail fields | `components/app/DetailList` (formatting via `formatValue`) |
| Form | `form/ResourceForm` (fields, resolver, server errors, stale reload, unsaved guard, toasts) |
| Delete confirmation | `components/app/ConfirmDialog` |
| Roles | `useRoles` from `@/auth`, `canRead`/`canWrite` from `@/manifest` |
| Record name | `formatDisplay(resource.display, record)` |
| Labels built at runtime | `tDynamic`, `fieldLabelKey`, `enumLabelKey` from `@/i18n/dynamic` |
| Route id | `useIdParam` from `@/lib/ids` |

## 2. Persons-specific code, and why it exists

Everything else is generic and driven by the manifest. These are the only persons-specific parts:

- **`src/features/persons/*`** (314 lines). Generated hooks and schemas have resource-specific names, and orval's
  types differ per resource, so a page cannot pick them up from the manifest without losing type safety. The pages
  only wire those hooks to shared components.
  - The `api:` block in the manifest was meant to make this generic; nothing reads it (see section 4).
- **`useOnSaved` and the delete handler.** Cache updates need the generated query key getters, which have
  per-resource names.
- **`enumValues`** (`{ gender: Object.values(PersonCreateRequestGender) }`). Allowed enum values live in the generated
  model, not the manifest. The manifest only names the i18n enum (`enum: Gender`).
- **`UpdatePersonBody.omit({ version: true })`.** The form never shows `version`; `ResourceForm` keeps it and passes it
  to `save`.
- **Registration.**
  - `ResourceKey` (`src/manifest/index.ts`): keeps `getResource` typed;
  - `src/i18n/resources.ts`: JSON imports are static;
  - `src/router.tsx`: lazy routes per feature.
- **Locale files** `persons.json` and the `Gender` enum labels.

## 3. Problems met and how they were solved

| Stage | Problem | Fix |
|---|---|---|
| 1 | `@hookform/resolvers@6` failed `npm install` (ERESOLVE on optional `effect` peers) | pinned `@hookform/resolvers@5.9.2`, which supports Zod 4 |
| 1 | TS 6 deprecates `baseUrl` | `paths` without `baseUrl` |
| 2 | The generated Zod schema had a Java-only regex `(?s)` from `@Pattern`, which crashed at import | fixed in the API (contract 3.0.0); `src/api/contract.test.ts` imports the schemas so CI catches it |
| 2 | The contract at first had optional response fields, `*/*` responses and a partial PUT | API Stage 0 (3.0.0): required fields, `application/json`, PUT replaces the record and sends `version` |
| 3 | Without `.env.local` the app hung on login | `requireEnv` names the missing `VITE_OIDC_*` variable; login errors render the error page |
| 3 | After login the original query string was lost (router transition race on the callback URL) | `RequireAuth` renders nothing while the URL still has `code`/`error` + `state` |
| 3 | "Sign in again" after a failed callback looped | `returnToFromLocation` strips OIDC callback params |
| 3 | ESLint `react-hooks/refs` flagged RHF `field` objects and a ref read in render | destructure `useController` fields; capture focus in `onOpenAutoFocus` |
| 4 | `useBlocker` needs a data router | switched to `createBrowserRouter`; `AuthProvider` gets `router.navigate` |
| 4 | Server field errors could not take focus while inputs were disabled during submit | only the submit button is disabled |
| 4 | **Lost update:** a background refetch (window focus) moved `version` under an open form, so a conflicting save succeeded | `ResourceForm` captures `version` once and changes it only on Reload; e2e fires `visibilitychange` before saving |
| 4 | An old link to `page=2` showed "no records" | `clampPage` moves to the last page; the deep-link e2e uses sort + search instead of a page number |
| 4 | Failed e2e runs left test data | `afterEach` deletes through the API with the session token, even after a failure |
| 4 | Mobile cards read "Smith John" (two `primary` columns) while titles used `display` | cards use `display` (user decision) |
| 4→3.1 | Server field messages were hard-coded English | API 3.1 adds `errors[].code`; the UI shows `common.validation.<code>` and re-translates it on a language switch |
| 3.1 | Reviewer: a field error without `code` was dropped, so a duplicate-email 409 looked like a stale version | the fetcher keeps it with code `invalid` |
| 5 | Playwright `storageState` does not save `sessionStorage`, where the OIDC user lives | save the Keycloak SSO cookie instead; `openAs` lets Keycloak redirect back without the form. Logout tests use their own fresh login so they never end the shared session |
| any | The Playwright MCP tab sometimes ignored clicks | open a fresh tab (harness glitch, not an app bug) |

`tasks/lessons.md` has no entries: there were no user corrections. The decisions the user made are in the table
above and in the git log.

Known gaps, left as is:
- the gender column sorts by enum code, not by label (API behaviour; the user kept it sortable);
- user-menu labels are not read by screen readers;
- a server `past` error is cleared by a client-side re-validation until the next save;
- the API reports birth-date errors before duplicate-email errors, so the user sees them one save at a time.

## 4. `ui-manifest.yaml`: what was missing, what is unused

**Added during the build:**
- `enum: <EnumName>` on enum columns and form fields. Field labels can be derived from the field name; enum labels
  cannot.
- The `mobile:` comment now says that the card title is `display`.

**Unused or redundant:**
- `api:` (`tag`, `list`, `get`, …): nothing reads it. The feature files import the generated hooks by name. Remove it,
  or keep it only as documentation.
- `list.rowClick: detail`: only one behaviour exists. It is typed, but nothing branches on it.
- `list.search: q`: `listState` and `SearchInput` always use `q`, and only one search box exists.
- `mobile: primary`: since cards use `display`, only the first `primary` column matters (it is the table's link
  column). A single `linkColumn` key would say it more plainly.
- `format: date` and `input: date` repeat `format: date` from the contract. The enum values repeat the contract enum.
  Only the i18n enum name is new information.

**Missing (needed by the next resource, or hard-coded today):**
- **Read-only and create-only fields.** Every form field is editable, and every schema field is shown.
- **Default values for new records.**
- **Input types beyond text, date and select:** number, textarea, checkbox, email keyboard.
- **A searchable-fields hint** for the search placeholder. The API decides what `q` matches.
- **The app name.** "Person UI" is in `index.html` and `common.appName`/`documentTitle`, not in the manifest.
- **Relations between resources** (a select loaded from another resource). Persons has none.
