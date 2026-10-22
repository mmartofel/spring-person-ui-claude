---
name: crud-resource
description: Adds one CRUD resource (list, detail, create/edit form, delete) to this app, or updates an existing resource after its API contract changed. Use when the user asks to "add a resource / screen / CRUD for <X>", "build the <X> screens", or says "the API changed", "new fields in <X>", "update <X> after contract:pull".
---

# crud-resource

Builds or updates one resource the same way as the golden resource `src/features/persons/`.
Conventions are in `CLAUDE.md`, contract rules in `docs/API-CONTRACT.md`, file-by-file wiring in
[references/wiring.md](references/wiring.md), lessons in `docs/PATTERNS.md`.

## Input
- **Resource key**: plural, lower camel case, e.g. `orders`. It is also the route, the i18n namespace and the folder.
- **OpenAPI tag**, e.g. `Orders`.

Ask for whichever is missing. Say whether it is a **new** resource or an **existing** one (`ui-manifest.yaml` has it).

## Phase A: check and draft (no code yet)
- [ ] The contract is current: `npm run contract:pull && npm run api:generate` if the user has not done it.
- [ ] Run the `contract-auditor` agent for the tag. If the resource is not compliant, **stop**: print the auditor's
      API changes for the API repo. Never work around the contract in the UI. A report from this session on the same
      contract (`git diff contract/openapi.json` empty since then) may be reused; say so.
- [ ] **New resource:** draft the `resources.<key>` entry of `ui-manifest.yaml` with the same keys as `persons`
      (`route`, `nav`, `display`, `permissions`, `list`, `detail`, `form`) from the contract schemas.
- [ ] **Existing resource:** `git diff contract/openapi.json` (or `git diff <last commit touching it> -- contract/openapi.json`).
      List added, removed and changed fields, enums, defaults, constraints, query params and error codes for the tag
      (also shared schemas such as `FieldError`: a field becoming optional changes generic code). Other tags in the
      same pull are out of scope; say so.
      Draft the manifest changes: where each new field goes (list column and `mobile`, detail, form group, input,
      filter) and which removed fields leave the manifest.
- [ ] List the decisions the manifest cannot express yet (see PATTERNS.md section 4 "Missing") and how you propose to
      add them generically, including new i18n key shapes. Order columns by importance and say which ones go out of
      view at 768 px (the table scrolls inside its frame with an edge fade).
- [ ] **STOP. Show the draft and the open decisions and wait for the user's approval.** Missing decision: ask, never guess.

## Phase B: build (after approval)
- [ ] Manifest: write the approved entry; add the key to `ResourceKey` (`src/manifest/index.ts`), a new `nav.icon`
      to `src/manifest/icons.ts` and the resource to `src/api/sources.ts`. New manifest keys: extend the types in `src/manifest/index.ts` and the generic
      component that reads them; never branch on a resource key.
- [ ] i18n: `src/locales/{pl,en}/<key>.json` (`title`, `newTitle`, `editTitle`, `empty`, `fields.*`, nested
      `fields.<object>.*`, `groups.<object>`, `filters.<param>`), enum labels in `enums.json`, error codes in
      `common.validation.*`, namespaces in `src/i18n/resources.ts`. Shared `common.*` labels must fit every resource:
      gender-neutral in Polish.
- [ ] Feature folder `src/features/<key>/`, copied from `src/features/persons/` and renamed (wiring.md).
- [ ] Routes spread into `src/router.tsx` before the `*` route.
- [ ] Unit tests for new generic code only; `src/i18n/locales.test.ts` must pass.
- [ ] E2E `e2e/<key>.spec.ts` from `e2e/persons.spec.ts`: happy path plus at least one error case per changed flow
      (filters: URL state, reload, clear, mobile sheet). Run the whole suite: new fields can break old assertions.
- [ ] `npm run contract:check` passes (generated code committed with the contract).

## Definition of Done (from CLAUDE.md)
1. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.
2. The changed screens were opened with the Playwright MCP server at 375, 768 and 1440 px, logged in as `editor`
   and as `viewer`, in PL and EN, with no console errors.
3. The `ui-reviewer` agent reviewed the change and its findings are fixed or listed for the user.
4. E2E tests cover the changed flow (happy path plus at least one error case).
5. README updated if commands, setup or behaviour changed.

## When the API is wrong
A flow that fails because of an API bug (not a contract gap): reproduce it through the API, stop and give the user a
prompt for the API repo, park the e2e test with `test.fixme` naming the API version, and list it in PATTERNS.md section 3.
After the fix: pull and regenerate (also for a version-only change), re-enable the test as a regression test.

## Keep the skill true
If a step here or in `references/wiring.md` was wrong or incomplete, fix this skill and `docs/PATTERNS.md` in the
same session and list the fixes in the commit message. Record the resource-specific line count in PATTERNS.md
section 2.
