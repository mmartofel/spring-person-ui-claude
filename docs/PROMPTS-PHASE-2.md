# Phase 2 prompts: from a reference app to a reusable blueprint

Same rules as phase 1: one Claude Code session per step (or `/clear`), plan mode, commit after each step,
review the result yourself before the next step.

Goal of this phase: prove that the method works for a resource that is *different* from persons,
then extract the method into a blueprint repository that starts a new project from any compliant API.

## Where to run each step

Open Claude Code in the folder of the repository named in the table and paste the prompt there.
Both repositories should sit side by side (`../spring-person-api-claude` is the default contract source of the UI).

| Order | Step | Repository (folder to start `claude` in) | Result |
|---|---|---|---|
| 1 | 7 - skill `crud-resource`, agent `contract-auditor` | **UI**: `spring-person-ui-claude` | skill and agent in `.claude/` |
| 2 | 8.0 - Flyway | **API**: `spring-person-api-claude` | schema managed by migrations |
| 3 | 8a - new Person fields | **API** | new contract version |
| 4 | 9a - Person changes in the UI | **UI** (starts with `npm run contract:pull`) | updated persons screens |
| 5 | 8b - Task resource | **API** | new contract version |
| 6 | 9b - tasks in the UI | **UI** (starts with `npm run contract:pull`) | tasks screens |
| 7 | 10 - blueprint | **new repo** `crud-ui-blueprint`, created from the UI repo | template repository |
| 8 | 11a - validation API | **new repo** `library-api` | second API |
| 9 | 11b - validation UI | **new repo** `library-ui`, created from the template | second UI |

The rule behind it: the API repo changes the contract (`contract/openapi.json`), the UI repo only consumes it.
After every API step, commit and push the API repo before you switch to the UI repo.

---

## Step 7 - Turn PATTERNS.md into a skill and an agent (UI repo)

Why first: the second resource (step 9) is then built *by the skill*, so it tests the skill.

```
Read CLAUDE.md and docs/PATTERNS.md. Use plan mode.

1. Create the project skill .claude/skills/crud-resource/SKILL.md that adds one CRUD resource to this app
   or updates an existing one after its contract changed.
   Base it on PATTERNS.md section 1 (steps, file table, shared pieces) and section 2. Requirements:
   - frontmatter: name crud-resource; a description that triggers on "add a resource/screen/CRUD for <X>"
     and on "the API changed / new fields in <X>";
   - input: the resource name and its OpenAPI tag; the skill first checks the contract (contract-auditor
     agent). For a new resource it drafts the ui-manifest.yaml entry; for an existing one it diffs the
     contract (git diff contract/openapi.json) and drafts the manifest changes (new fields placed in
     columns, detail, form groups, filters). Either way it STOPS for the user's approval before writing code;
   - the steps as a checklist, ending with the Definition of Done from CLAUDE.md;
   - keep SKILL.md short; put the file-by-file wiring guide in references/wiring.md and point to
     src/features/persons/ as the reference code.
2. Create the agent .claude/agents/contract-auditor.md (read-only: Read, Grep, Glob, Bash for reading only).
   It checks contract/openapi.json against the rules in CLAUDE.md "API contract" plus the lessons in
   PATTERNS.md section 3: operationIds, application/json, required response fields, paged lists,
   Problem Details with errors[].code, version on update, no Java-only regex in patterns, enums as strings.
   For each resource it reports: compliant / list of API changes needed (written so they can be pasted
   as a prompt into the API repo).
3. Move the "API contract" rules from CLAUDE.md into docs/API-CONTRACT.md (the single source, also for
   API teams) and leave a one-line pointer in CLAUDE.md. Add the relation and filter rules from step 8 below
   as "planned" so the auditor knows them.

Run contract-auditor on the current contract; it must report persons as compliant.
```

---

## Step 8.0 - Flyway (API repo)

From now on every schema change is a versioned SQL migration; Hibernate only validates.

```
Introduce Flyway database migrations in the Person API. Use plan mode.

1. Dependencies for Spring Boot 4 with PostgreSQL: the Flyway starter (Boot 4 moved Flyway
   auto-configuration into its own module) and flyway-database-postgresql. Versions managed by Boot.
   Check the current Spring Boot 4 reference docs for the exact artifact names.
2. V1__create_person.sql in src/main/resources/db/migration creates the current schema exactly as the
   entity maps it today (table, columns, nullability, unique constraint uk_person_email, version column).
   Use explicit constraint names.
3. spring.jpa.hibernate.ddl-auto: validate, so any mismatch between entities and migrations fails at startup.
4. Integration tests (Testcontainers) must run the migrations and pass with validate.
5. Rules in CLAUDE.md (section "Database"): never edit an applied migration; one new file
   V<n>__<description>.sql per change; every entity change ships with its migration in the same commit;
   new NOT NULL columns get a DEFAULT or a backfill so existing data keeps working.
6. README: local databases created by Hibernate before this version must be recreated
   (docker compose down -v), the same for the PostgreSQL volume in Kubernetes. Do not add baseline settings.
Bump the version per the rule in CLAUDE.md. The contract must not change (contract/openapi.json identical).
```

Before running the next steps, recreate your local database: `docker compose down -v && docker compose up -d`.

---

## Step 8a - Extend Person (API repo)

Covers changing an existing resource: a nested object, a status shown as a badge, a date range with
cross-field validation, and list filters on an existing list.

```
Extend Person in the Person API. Use plan mode. Follow the API contract rules in CLAUDE.md.

New fields:
- address: optional nested object { street, postalCode, city, countryCode }, all parts optional;
  street max 120, postalCode max 16 (free text, international), city max 80,
  countryCode ISO 3166-1 alpha-2 (pattern ^[A-Z]{2}$). Store it as a JPA @Embeddable.
- status: enum AVAILABLE, UNAVAILABLE; required in the contract; default AVAILABLE when not sent on create.
  Existing rows must get AVAILABLE (DEFAULT in the Flyway migration), so a database with data keeps working.
- availableFrom, availableTo: optional dates; an optional window in which the person can be booked
  (empty = no limit). Cross-field rule: availableFrom <= availableTo when both are set; on violation
  return a field error on availableTo with code "date-range".

List filters (named query parameters next to q, page, size, sort; add the filter rule to CLAUDE.md
"API contract"): status, availableOn (date: status AVAILABLE and the date inside the window, open ends
allowed), countryCode.

Patterns in the contract must be JavaScript-compatible (the UI generates Zod from them).
Schema changes go into a new Flyway migration (see "Database" in CLAUDE.md).
Tests: positive and negative for every rule (including the date range, the default status and each filter).
Update README, regenerate contract/openapi.json, bump the version per the rule in CLAUDE.md.
```

---

## Step 8b - Second resource in the API (API repo)

The resource is chosen to cover what PATTERNS.md lists as missing: number, boolean, long text,
read-only and server-set fields, default values, a relation to another resource,
and a delete that is blocked by a relation.

```
Add a Task resource to the Person API. Use plan mode. Follow the API contract rules in CLAUDE.md.

Task fields:
- id, version (as for Person)
- title: required, max 120
- description: optional, max 2000 (long text)
- priority: enum LOW, MEDIUM, HIGH; required; default MEDIUM when not sent on create
- estimateHours: optional decimal, 0.5-999, step 0.5
- done: boolean, default false
- dueDate: optional date (no @Past/@Future)
- assignee: optional relation to Person
- createdAt, updatedAt: set by the server, read-only (Instant)

Contract rules for relations and filters (add them to CLAUDE.md "API contract"):
- Requests reference a related record by id: assigneeId (nullable).
- Responses embed a summary of the related record: assignee: { id, label } where label is the
  display name ("firstName lastName"), so a list never needs one request per row.
- List filters are named query parameters next to q, page, size, sort:
  GET /api/tasks?q=&done=&priority=&assigneeId=
- Deleting a Person that still has tasks returns 409 Problem Details with errors[].code "in-use"
  (no field) and a detail message; it must not cascade.
- Unknown assigneeId on create/update returns 400 with a field error on assigneeId, code "not-found".

Endpoints and operationIds as for persons: listTasks, getTask, createTask, updateTask, deleteTask.
Same roles as persons. PUT replaces the record and requires version.
The table, the foreign key to person (ON DELETE RESTRICT) and an index on assignee_id go into a new
Flyway migration.
Tests: positive and negative for every rule above. Update README, regenerate contract/openapi.json,
bump the version per the rule in CLAUDE.md.
```

---

## Step 9a - Person changes in the UI, built by the skill (UI repo)

```
npm run contract:pull && npm run api:generate first. Then: update the persons resource after the
contract change, using the crud-resource skill.

Add these capabilities generically (driven by ui-manifest.yaml and the contract), not as
person-specific code:
- nested object fields: the address shown as one block in the detail, as its own form group
  ("Address") in the form; a list column can show a nested field (address.city);
- country select from countryCode: labels from Intl.DisplayNames in the current language
  (no translated country list in the locale files), searchable;
- status shown as a badge in the list and detail (manifest format: badge, with a colour per value
  from the shadcn tokens; the label still comes from enums.<EnumName>);
- date range input: availableFrom/availableTo side by side, the same cross-field rule checked on the
  client, and the server's "date-range" error shown on availableTo;
- list filters declared in the manifest (enum select for status, date for availableOn, country select),
  kept in the URL like the other list state, with a "clear filters" action; on mobile they go into a sheet.

Whenever the skill's instructions were wrong or incomplete, fix .claude/skills/crud-resource and
docs/PATTERNS.md in the same session, and list those fixes in the commit message.
Definition of Done as in CLAUDE.md, including e2e for the new fields and filters.
```

---

## Step 9b - Second resource in the UI, built by the skill (UI repo)

```
npm run contract:pull && npm run api:generate first. Then: add the tasks resource using the
crud-resource skill.

The manifest and the generic components need these new capabilities; add them generically
(driven by ui-manifest.yaml and the contract), not as task-specific code:
- form inputs: number (min/max/step from the contract), textarea, checkbox/switch;
- read-only fields shown in the detail and edit view but not editable (createdAt, updatedAt),
  formatted as date-time in the current language;
- default values for new records (taken from the contract defaults where present);
- relation field: a searchable combobox that queries the related resource's list endpoint with q,
  shows the related record's display name, supports "none"; in lists and details show assignee.label
  and link to the related record;
- list filters reuse the step 9a mechanism; add a boolean filter (done) and a relation filter (assignee);
- a 409 "in-use" error on delete shows the server's translated message instead of a generic error
  (persons delete must handle it too).
Also show the person's tasks on the person detail page (a small list filtered by assigneeId with a
link to the filtered task list) only if it stays generic (manifest: detail.related).

Whenever the skill's instructions were wrong or incomplete, fix .claude/skills/crud-resource and
docs/PATTERNS.md in the same session, and list those fixes in the commit message.
Definition of Done as in CLAUDE.md, including e2e for tasks (filters, relation, in-use delete).
```

After this step, look at two numbers in PATTERNS.md: how many task-specific lines were needed
compared to persons, and how many skill fixes were needed. Few fixes = the method is repeatable.

---

## Step 10 - Extract the blueprint (new repo `crud-ui-blueprint`)

Simplest form first: a GitHub *template repository* (button "Use this template",
or `gh repo create my-ui --template mmartofel/crud-ui-blueprint`). The skills, agents and hooks live in
its `.claude/` folder and travel with every new project. A versioned plugin comes later, only when
several projects need the same skill updates.

```
Create the crud-ui-blueprint repository from this app. Use plan mode.

1. Copy the app without any resource: remove src/features/persons and src/features/tasks, their routes,
   locale namespaces, manifest entries, e2e specs and generated client. Everything in src/components/app,
   src/auth, src/i18n, src/api/fetcher.ts, src/manifest, CI, hooks and agents stays.
   The app must still build and show an empty shell with a "no resources yet" home page.
2. Keep the reference implementation inside the skill: copy the persons and tasks feature files into
   .claude/skills/crud-resource/references/examples/ (persons = simple resource, tasks = relations and
   filters) and point references/wiring.md at them instead of src/features/.
3. Replace project-specific values with configuration: app name (manifest `app.name`, used by index.html
   title and i18n), OIDC authority and client id (.env), API proxy target (.env), contract source,
   supported languages (default pl, en).
4. Add the skill .claude/skills/crud-ui-init/SKILL.md for a fresh project: ask for app name, languages,
   API contract source, OIDC settings and roles; pull the contract; run contract-auditor and stop if the
   API is not compliant (print the changes for the API team); draft ui-manifest.yaml for all resources
   and stop for approval; then run crud-resource for each approved resource, one at a time.
5. Write CLAUDE.md for the blueprint (generic, no Person API specifics), README (how to start a project
   from the template, prerequisites, the method in 6 steps), and keep docs/API-CONTRACT.md as the
   document you hand to API teams. Add a short section for Spring Boot backends: which rules come from
   CLAUDE.md of spring-person-api-claude and the pitfalls already met (springdoc @ParameterObject,
   PagedModel, no Java-only regex, errors[].code, build-info version, Flyway with ddl-auto validate).
   Also add docs/API-CLAUDE.md: the "API contract" and "Database" sections of the API's CLAUDE.md as a
   ready block to paste into the CLAUDE.md of any new Spring Boot API.
6. Mark the repo as a template repository on GitHub (gh repo edit --template).
```

---

## Step 11 - Validate on an API that was not used to build the blueprint

The blueprint is proven only when it works for an unrelated API. There is no such API yet, so build a
small one, and build it only from docs/API-CONTRACT.md: that also tests whether the contract document is
enough for an API team that has never seen the Person API.

### 11a - Validation API (new repo `library-api`)

Setup: create an empty repo `library-api` next to the others, install the piomin Spring Boot plugin in it
(as for the Person API), and copy `docs/API-CONTRACT.md` and `docs/API-CLAUDE.md` from `crud-ui-blueprint`.
Start the CLAUDE.md of the new repo from `docs/API-CLAUDE.md`.

```
Build a small Spring Boot 4 REST API for a library. Use plan mode.
The API contract rules are in docs/API-CONTRACT.md and the Spring Boot rules in CLAUDE.md; follow them
exactly, they are the requirement. Do not look at any other project for the rules.
Database: PostgreSQL with Flyway migrations from the first commit (ddl-auto validate).

Resources:
- Author: name (required), country (ISO alpha-2, optional), born (optional year, number)
- Book: title (required), isbn (required, unique, 409 with a field error), publishedYear (number),
  genre (enum), pages (number), author (relation to Author), available (boolean, default true)
- Delete of an Author with books: 409 "in-use".
Book list filters: q, genre, authorId, available.
Security: OAuth2 resource server with Keycloak, a new realm "library" with roles library-viewer and
library-editor, a public PKCE client library-ui for http://localhost:5173, demo users viewer/editor.
Docker Compose for the database and Keycloak (use ports that do not clash with the Person API stack,
or document that only one stack runs at a time). Tests positive and negative. Commit contract/openapi.json.
```

### 11b - New UI from the template

```
gh repo create library-ui --template mmartofel/crud-ui-blueprint --private --clone
```
Then in Claude Code in that repo: "Set up this project for the API in ../library-api" (crud-ui-init).

Note every place where you had to step in or correct Claude. Those notes go back into the blueprint
(skills, CLAUDE.md, API-CONTRACT.md) as fixes. Two or three such rounds give a stable method.
