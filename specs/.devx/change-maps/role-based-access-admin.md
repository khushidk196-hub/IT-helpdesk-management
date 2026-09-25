# Change Map - Role-Based Access And Administration

> Advisory implementation map for IDE code generation. Verify all paths and ownership in the actual workspace before editing.

- Feature slug: `role-based-access-admin`
- Suggested owner repo type: `current-repo`
- Impacted repo types: `current-repo`
- Confidence: 0.45

## Read First

- `specs/.devx/project-context.md`
- `specs/.devx/current-state.md`
- `specs/.devx/implementation-check.md`
- `specs/.devx/change-maps/role-based-access-admin.md`
- `specs/.devx/guidance/golden-repo-guidelines.md`
- `specs/role-based-access-admin/specs.md`
- `specs/role-based-access-admin/requirements.md`
- `specs/role-based-access-admin/prompt.md`

## Candidate Areas

- UI screens/components
- API routes/services
- Data model/persistence
- Authentication/authorization
- Tests

## Existing Code Search Hints

- Search the discovered workspace for existing ui screens/components before creating new code.
- Search the discovered workspace for existing api routes/services before creating new code.
- Search the discovered workspace for existing data model/persistence before creating new code.
- Search the discovered workspace for existing authentication/authorization before creating new code.
- Search the discovered workspace for existing tests before creating new code.

## Tests To Inspect

- Existing unit tests near candidate implementation files
- Existing integration/API tests for related routes or services
- Existing UI/e2e tests for related screens or flows

## Constraints

- Verify every suggested path in the actual IDE workspace before editing.
- Prefer extending existing modules over creating parallel implementations.
- Existing code patterns override generic guidance when they conflict.
- Do not create a new repo or major folder structure unless the spec explicitly requires it.

## Routing Rationale

- Use current workspace discovery output to confirm ownership before implementation.
