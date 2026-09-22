# TDD Test Specifications: Ticket Classification And Priority Management

## Overview
These tests validate backend support for ticket categorization and priority management within a monolith architecture. The scope covers API behavior, service/business rules, validation, persistence, auditability, and authorization-relevant backend constraints tied to ticket creation and updates.

TDD approach:
1. Write failing tests for category and priority behaviors derived from REQ-002.
2. Implement only enough backend logic to satisfy each test.
3. Refactor after each passing step while keeping all tests green.

Assumed Golden Repo backend standards applied as test constraints where source detail is limited:
- Input validation and clear rejection of invalid payloads
- Deterministic API responses and persistence behavior
- No silent data mutation for invalid/unknown values
- Audit/history integrity for ticket changes
- Role-based access constraints enforced server-side where applicable
- Backward-safe partial updates only to fields explicitly provided

## Unit Test Specifications

### Ticket Category Validation
- **Test:** accepts ticket creation with a valid category
  - **Given:** a ticket creation request with a supported non-empty category
  - **When:** category validation is executed
  - **Then:** validation passes and the category is preserved unchanged
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test for accepted category; Green: allow supported category values only; Refactor: extract category validation rule if reused 3+ times

- **Test:** rejects ticket creation with missing category when category is required by feature scope
  - **Given:** a ticket creation request without a category
  - **When:** validation is executed
  - **Then:** validation fails with a field-specific error for category
  - **Priority:** High
  - **TDD Phase:** Red: assert missing category fails; Green: add required-field rule; Refactor: consolidate required-field error formatting

- **Test:** rejects unsupported category values
  - **Given:** a ticket payload with a category outside the allowed set
  - **When:** category validation is executed
  - **Then:** validation fails and no ticket entity is produced
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid category rejected; Green: enforce allowed-value rule; Refactor: centralize allowed classification lookup

- **Test:** rejects blank or whitespace-only category
  - **Given:** a ticket payload with category as blank text
  - **When:** validation is executed
  - **Then:** validation fails with invalid category error
  - **Priority:** Medium
  - **TDD Phase:** Red: add failing blank-input test; Green: trim and validate non-empty; Refactor: reuse normalization helper only if repeated

### Ticket Priority Validation
- **Test:** accepts ticket creation with a valid priority
  - **Given:** a ticket creation request with a supported priority value
  - **When:** priority validation is executed
  - **Then:** validation passes and the priority is stored as requested
  - **Priority:** High
  - **TDD Phase:** Red: failing test for accepted priority; Green: implement allowed priority rule; Refactor: unify classification validation patterns

- **Test:** rejects missing priority when priority is required by feature scope
  - **Given:** a ticket creation request without a priority
  - **When:** validation is executed
  - **Then:** validation fails with a field-specific error for priority
  - **Priority:** High
  - **TDD Phase:** Red: assert priority missing fails; Green: add required-field rule; Refactor: align validation error structure

- **Test:** rejects unsupported priority values
  - **Given:** a ticket payload with priority outside the supported set
  - **When:** validation is executed
  - **Then:** validation fails and persistence is not attempted
  - **Priority:** High
  - **TDD Phase:** Red: failing unsupported-priority test; Green: enforce allowed-value rule; Refactor: extract common enum/value validator after Rule of Three

- **Test:** normalizes valid priority input according to repository standards
  - **Given:** a valid priority value with casing/format variation allowed by API contract
  - **When:** normalization and validation are executed
  - **Then:** stored domain value is canonical and response is deterministic
  - **Priority:** Medium
  - **TDD Phase:** Red: define expected canonical behavior; Green: implement minimal normalization; Refactor: keep normalization close to boundary layer

### Ticket Classification Update Rules
- **Test:** updates category on an existing ticket with a valid new category
  - **Given:** an existing ticket and a valid replacement category
  - **When:** the classification update service is invoked
  - **Then:** the ticket category is changed and marked as updated
  - **Priority:** High
  - **TDD Phase:** Red: failing update test; Green: implement targeted category mutation; Refactor: isolate patch/update intent logic

- **Test:** updates priority on an existing ticket with a valid new priority
  - **Given:** an existing ticket and a valid replacement priority
  - **When:** the priority update service is invoked
  - **Then:** the ticket priority is changed and marked as updated
  - **Priority:** High
  - **TDD Phase:** Red: failing update test; Green: implement minimal update path; Refactor: deduplicate update field handling if repeated

- **Test:** supports updating category and priority independently
  - **Given:** an existing ticket and a patch that changes only one of the two fields
  - **When:** the update service processes the patch
  - **Then:** only the provided field changes and the other remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing partial-update tests; Green: apply field-by-field update semantics; Refactor: extract patch merge helper if needed

- **Test:** rejects update when new category or priority is invalid
  - **Given:** an existing ticket and an invalid category or priority in the update request
  - **When:** update validation is executed
  - **Then:** the update is rejected and the original persisted values remain unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-update test; Green: validate before mutation; Refactor: enforce transactional boundary

### Audit And History Rules
- **Test:** creates an audit/history entry when category changes
  - **Given:** an existing ticket with an original category
  - **When:** category is successfully updated
  - **Then:** a history record captures old and new category values
  - **Priority:** High
  - **TDD Phase:** Red: failing audit test; Green: append minimal history entry; Refactor: standardize history event structure

- **Test:** creates an audit/history entry when priority changes
  - **Given:** an existing ticket with an original priority
  - **When:** priority is successfully updated
  - **Then:** a history record captures old and new priority values
  - **Priority:** High
  - **TDD Phase:** Red: failing priority audit test; Green: emit minimal history event; Refactor: reuse audit builder if repeated

- **Test:** does not create audit/history entry when requested value is unchanged
  - **Given:** an existing ticket and an update request with the same category and/or priority
  - **When:** the service processes the request
  - **Then:** no change event is recorded and no unnecessary persistence write occurs
  - **Priority:** Medium
  - **TDD Phase:** Red: failing no-op test; Green: short-circuit unchanged updates; Refactor: share equality-check logic carefully

### Authorization And Business Constraints
- **Test:** permits classification changes only for authorized roles
  - **Given:** a request context with a role allowed to manage tickets
  - **When:** category or priority update is requested
  - **Then:** the service authorizes the action
  - **Priority:** High
  - **TDD Phase:** Red: failing authorization success test; Green: add minimal role check; Refactor: move policy logic to dedicated authorization service

- **Test:** rejects classification changes for unauthorized roles
  - **Given:** a request context with a role not allowed to manage classification or priority
  - **When:** update is requested
  - **Then:** the action is denied and no data is changed
  - **Priority:** High
  - **TDD Phase:** Red: failing authorization-denied test; Green: enforce role check before mutation; Refactor: standardize forbidden error mapping

## Integration Test Specifications

### Ticket Creation API
- **Test:** creates a ticket with valid category and priority
  - **Given:** a valid API request containing required ticket fields plus supported category and priority
  - **When:** the create-ticket endpoint is called
  - **Then:** the response indicates success and the persisted ticket contains the same category and priority
  - **Priority:** High

- **Test:** returns validation error for invalid category or priority during creation
  - **Given:** an API request with unsupported or missing category and/or priority
  - **When:** the create-ticket endpoint is called
  - **Then:** the response indicates client validation failure and no ticket is persisted
  - **Priority:** High

### Ticket Update API
- **Test:** updates category and persists audit history
  - **Given:** an existing ticket and an authorized update request with a new valid category
  - **When:** the update-ticket endpoint is called
  - **Then:** the ticket is updated and corresponding history is persisted
  - **Priority:** High

- **Test:** updates priority and persists audit history
  - **Given:** an existing ticket and an authorized update request with a new valid priority
  - **When:** the update-ticket endpoint is called
  - **Then:** the ticket is updated and corresponding history is persisted
  - **Priority:** High

- **Test:** rejects unauthorized update of category or priority
  - **Given:** an existing ticket and an unauthorized caller
  - **When:** the update-ticket endpoint is called with category or priority changes
  - **Then:** the response indicates forbidden access and no data or history is changed
  - **Priority:** High

- **Test:** preserves unchanged fields on partial update
  - **Given:** an existing ticket with both category and priority set
  - **When:** the update endpoint is called with only one of those fields
  - **Then:** only the supplied field changes in persistence and response payload
  - **Priority:** High

### Repository And Transaction Boundaries
- **Test:** does not persist partial changes when validation fails
  - **Given:** an update request containing one valid field and one invalid field
  - **When:** the service executes the update
  - **Then:** neither classification field is persisted and no audit record is created
  - **Priority:** High

- **Test:** returns persisted canonical values after create or update
  - **Given:** a request using acceptable input form per API contract
  - **When:** create or update succeeds
  - **Then:** the API response matches persisted canonical category and priority values
  - **Priority:** Medium

## Acceptance Test Scenarios

### US 1 - Ticket Categorization Support
- **Scenario:** create ticket with category and priority
  - **Given:** an authorized caller submits a valid ticket creation request including category and priority
  - **When:** the ticket is created
  - **Then:** the system stores the ticket with the selected category and priority

- **Scenario:** reject ticket creation when category is invalid
  - **Given:** a ticket creation request includes an unsupported or empty category
  - **When:** the API validates the request
  - **Then:** the request is rejected with a category validation error

- **Scenario:** reject ticket creation when priority is invalid
  - **Given:** a ticket creation request includes an unsupported or empty priority
  - **When:** the API validates the request
  - **Then:** the request is rejected with a priority validation error

### US 1 - Priority Management
- **Scenario:** update ticket priority after creation
  - **Given:** an existing ticket and an authorized caller with a valid new priority
  - **When:** the caller updates the ticket
  - **Then:** the ticket reflects the new priority and the change is recorded in history

- **Scenario:** update ticket category after creation
  - **Given:** an existing ticket and an authorized caller with a valid new category
  - **When:** the caller updates the ticket
  - **Then:** the ticket reflects the new category and the change is recorded in history

- **Scenario:** partial update changes only requested field
  - **Given:** an existing ticket with both category and priority assigned
  - **When:** an authorized caller updates only category or only priority
  - **Then:** the unspecified field remains unchanged

### US 1 - Role-Based Access And Auditability
- **Scenario:** prevent unauthorized priority or category change
  - **Given:** an existing ticket and a caller without required permissions
  - **When:** the caller attempts to update category or priority
  - **Then:** the system denies the request and preserves current data

- **Scenario:** record audit history for classification changes
  - **Given:** an existing ticket with original category or priority values
  - **When:** an authorized change succeeds
  - **Then:** the system stores an audit/history entry with previous and updated values

## Test-First Development Guidelines
1. Write creation validation tests first:
   1. valid category
   2. missing/invalid category
   3. valid priority
   4. missing/invalid priority
2. Write service tests for create behavior preserving category and priority.
3. Write update tests for partial and full classification changes.
4. Write negative update tests for invalid values and no-op updates.
5. Write audit/history tests for category and priority changes.
6. Write authorization tests for allowed and denied roles.
7. Write integration tests for create/update endpoints and persistence rollback behavior.

Implementation sequence recommendations:
1. Add minimal request validation for category and priority.
2. Add domain/service support for storing category and priority on create.
3. Add minimal update logic for each field independently.
4. Add transaction-safe validation-before-persist behavior.
5. Add audit/history recording for successful changes only.
6. Add authorization checks before update operations.
7. Run the full suite after each step; do not proceed with failing tests.

Refactoring considerations:
- Keep validation, authorization, and persistence concerns separated.
- Introduce shared validators/value objects only after the Rule of Three is met.
- Consolidate audit event creation if category/priority change patterns repeat.
- Maintain explicit mapping between API payloads and domain fields.
- Re-run all unit and integration tests after every refactor step.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - category at minimum valid length and maximum supported length, if constrained by contract
  - priority values at the edges of the allowed set
  - case/whitespace normalization behavior at API boundary, if supported
  - partial update with omitted fields versus explicit nulls

- Error handling tests
  - unknown category rejected with field-specific error
  - unknown priority rejected with field-specific error
  - ticket not found during category/priority update
  - forbidden update attempt returns authorization error without mutation
  - malformed payload returns request validation failure
  - unchanged category/priority update results in no duplicate history event

- Concurrency/timing tests (if applicable)
  - concurrent updates to category and priority do not produce lost updates
  - concurrent successful updates produce consistent persisted state and correct audit ordering
  - retry of the same update request does not create duplicate history entries if idempotency is part of API contract; otherwise verify duplicate requests create predictable results only once per successful persisted change