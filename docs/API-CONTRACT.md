# API contract rules

The single source of the rules an API must follow so that this UI (and any UI built from the same blueprint) can be
generated from its OpenAPI contract. The API team owns the contract; the UI consumes it and never works around it.
The `contract-auditor` agent checks `contract/openapi.json` against this document.

Examples use a resource `Person` (tag `Persons`, path `/api/persons`). Replace it with your resource.

## 1. Contract document
- OpenAPI 3.x, generated from the code and committed in the API repo as `contract/openapi.json`. CI fails when it is
  out of date. The UI copies it with `npm run contract:pull`.
- `info.version` is the API version (from the build, never hard-coded). A breaking change bumps the major version.
- One tag per resource. The tag groups the generated client code.

## 2. Endpoints
- All endpoints live under the base path `/api`. The UI calls relative URLs; production serves UI and API from one
  origin, so no CORS is needed.
- Five operations per resource, with these operationIds (they become the names of the generated hooks):

  | Method and path | operationId | Success |
  |---|---|---|
  | `GET /api/persons` | `listPersons` | 200 paged list |
  | `GET /api/persons/{id}` | `getPerson` | 200 record |
  | `POST /api/persons` | `createPerson` | 201 record |
  | `PUT /api/persons/{id}` | `updatePerson` | 200 record |
  | `DELETE /api/persons/{id}` | `deletePerson` | 204 no body |

- `{id}` is an integer (`int64`).
- Request and success response bodies are `application/json` (not `*/*`).

## 3. Schemas
- Separate schemas per direction: `<Resource>Response`, `<Resource>CreateRequest`, `<Resource>UpdateRequest`.
  Entities are never exposed.
- **Responses mark every always-present field as `required`**, at least `id` and `version`. Otherwise the generated
  TypeScript types are optional everywhere.
- **Validation constraints are in the schema** (`required`, `minLength`, `maxLength`, `minimum`, `maximum`, `format`,
  `pattern`, `enum`), because the UI generates its Zod validation from them. A rule that cannot be expressed in the
  schema (such as "date in the past") must still return a field error with a documented `code` (section 5).
- **`pattern` must be valid JavaScript regex** (the UI compiles it with `new RegExp`). No Java-only syntax: inline
  flags such as `(?s)` or `(?i)`, possessive quantifiers (`a++`, `a*+`), atomic groups `(?>…)`, `\A`, `\Z`, `\z`,
  `\p{javaLowerCase}`.
- **Enums are string enums** (`type: string` with `enum: [...]`), values in `UPPER_CASE`. The UI shows translated
  labels per value, never the raw value.
- Dates are `type: string, format: date` (`YYYY-MM-DD`); timestamps `format: date-time`.

## 4. Lists
- `GET /api/persons` is paged. Query parameters, each a separate parameter (not one `pageable` object):
  `page` (0-based), `size`, `sort` (`field,asc|desc`, may repeat) and `q` (free-text search; the API decides which
  fields it matches).
- Response: `{ content: T[], page: { number, size, totalElements, totalPages } }` (Spring Data `PagedModel`).

## 5. Errors
- Every error is RFC 9457 Problem Details, `application/problem+json`, schema `Problem`
  (`type`, `title`, `status`, `detail`, `instance`, `errors`), with `status` and `title` required.
- Field errors go in `errors: [{ field, code, message }]`, schema `FieldError` with all three fields required.
  - `code` is a stable string enum documented in the `FieldError` schema (today: `required`, `email`, `past`,
    `unique`, `invalid`). The UI translates it; a new code is a contract change.
  - `message` is an English fallback only.
- Documented error responses:
  - 400 (validation) and 409 (conflict) on `POST` and `PUT`;
  - 404 on every `{id}` path.
- Status codes the UI handles:

  | Status | Meaning | UI behaviour |
  |---|---|---|
  | 400 | validation failed | field errors on the form fields |
  | 401 | no or expired token | re-login |
  | 403 | role missing | "no access" page |
  | 404 | record not found | "not found" page |
  | 409 with `errors[]` | conflict on a field, e.g. `unique` email | field error |
  | 409 without `errors[]` | stale `version`: someone else changed the record | dialog offering a reload |

## 6. Updates and concurrency
- Responses include `version` (optimistic locking).
- `PUT` replaces the whole record: `<Resource>UpdateRequest` has the same fields and constraints as the create
  request plus a required `version` from the last read. Optional fields sent as `null` are cleared.
- `<Resource>CreateRequest` has no `id` and no `version`.
- A `version` mismatch returns 409 without `errors[]`.

## 7. Security
- OAuth2 bearer JWT (security scheme `bearer`), issued by Keycloak (Authorization Code + PKCE in the UI).
- Roles come from the access token claim `realm_access.roles`: one read role (e.g. `person-viewer`) and one write
  role (e.g. `person-editor`, which also reads). Reads need either role; writes need the write role.

## 8. Accepted as is (not violations)
- `PagedModel` and `PageMetadata` generated by springdoc have no `required` list. Their shape is fixed by Spring Data,
  and the UI relies on it.
- 401 and 403 are not listed per operation; the security scheme covers them.
- `Problem.errors` is optional (absent when there are no field errors).
- `@NotBlank` appears only as `minLength: 1`; a whitespace-only value is rejected by the server with a field error.

## 9. Planned rules (not used by any resource yet)
The auditor checks these only when a resource uses filters or relations.

### List filters
- Filters are named query parameters next to `q`, `page`, `size` and `sort`, one parameter per filter, typed in the
  contract (enum, `format: date`, boolean, integer id). Example: `GET /api/tasks?q=&done=&priority=&assigneeId=`.
- An empty or missing filter means "no filter".

### Relations
- Requests reference a related record by id: `<relation>Id` (e.g. `assigneeId`), nullable when the relation is
  optional.
- Responses embed a summary of the related record: `<relation>: { id, label }` (both required), where `label` is its
  display name (e.g. `"firstName lastName"`). A list never needs one request per row.
- An unknown `<relation>Id` on create or update returns 400 with a field error on `<relation>Id`, code `not-found`.
- Deleting a record that is still referenced returns 409 Problem Details with `errors: [{ code: "in-use" }]` (no
  `field`) and a `detail` message. It never cascades. This makes `FieldError.field` optional (a record-level error);
  `code` and `message` stay required. A 409 with `errors[]` is still never a stale version.

### Cross-field rules
- A rule that involves two fields (e.g. `availableFrom <= availableTo`) returns a field error on the later field
  (`availableTo`) with its own code (e.g. `date-range`).

New codes (`not-found`, `in-use`, `date-range`) are added to the `FieldError.code` enum when they are introduced.
