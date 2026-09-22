# TDD Test Specifications: Ticket Information Update During Processing

## Overview
These tests validate backend support for allowing IT Support Agents to update ticket information while a ticket is in processing. The focus is on API behavior, authorization, service/business rules, validation, persistence, and audit-relevant backend outcomes.

TDD approach:
1. Write failing tests for authorization and valid update behavior first.
2. Implement the minimum API/service/database logic to pass.
3. Refactor only after tests are green, preserving behavior and applying monolith service-layer boundaries and Rule of Three extraction.

## Unit Test Specifications
### Ticket Update Authorization
- **Test:** only IT Support Agents can update ticket information during processing
  - **Given:** a ticket in processing state and a caller without IT Support Agent privileges
  - **When:** an update request is evaluated by the service
  - **Then:** the update is rejected as unauthorized/forbidden and no persistence action occurs
  - **Priority:** High
  - **TDD Phase:** Red: write failing auth test first; Green: add minimal role check; Refactor: centralize authorization policy if reused 3+ times

- **Test:** IT Support Agent is permitted to update ticket information during processing
  - **Given:** a ticket in processing state and a caller with IT Support Agent privileges
  - **When:** the service evaluates a valid update request
  - **Then:** authorization succeeds and processing continues to validation/persistence
  - **Priority:** High
  - **TDD Phase:** Red: failing allow-path test; Green: permit supported role; Refactor: extract policy object only if repeated

### Ticket State Rules
- **Test:** updates are allowed when ticket status is processing
  - **Given:** an existing ticket with status processing and a valid update payload
  - **When:** update logic executes
  - **Then:** the service accepts the request for modification
  - **Priority:** High
  - **TDD Phase:** Red: failing state-allowance test; Green: add processing-state rule; Refactor: consolidate state predicates if repeated

- **Test:** updates are rejected when ticket is not in processing state
  - **Given:** an existing ticket in any non-processing state
  - **When:** an update request is submitted
  - **Then:** the service rejects the update with a business-rule error and does not persist changes
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-state test; Green: add explicit state guard; Refactor: move state rule into domain service if used broadly

### Payload Validation
- **Test:** valid ticket information update payload passes validation
  - **Given:** a processing ticket and a payload containing only supported editable fields with valid values
  - **When:** validation is performed
  - **Then:** no validation errors are returned
  - **Priority:** High
  - **TDD Phase:** Red: failing happy-path validation test; Green: add minimal field validation; Refactor: isolate validator from service orchestration

- **Test:** update request fails when required identifiers are missing
  - **Given:** a request missing ticket identifier and/or actor context
  - **When:** validation is performed
  - **Then:** the request is rejected with validation errors and no business logic executes
  - **Priority:** High
  - **TDD Phase:** Red: failing missing-input test; Green: enforce required request contract; Refactor: standardize request validation handling

- **Test:** update request fails when editable fields contain invalid values
  - **Given:** a processing ticket and a payload with malformed, empty, over-limit, or otherwise invalid field values
  - **When:** validation is performed
  - **Then:** field-level validation errors are returned and no persistence occurs
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-data test; Green: implement minimum rules from contract/Golden Repo standards; Refactor: reuse common validators where patterns repeat

- **Test:** update request rejects unsupported or immutable fields
  - **Given:** a payload attempting to modify protected fields such as system-managed identifiers, status, or audit-managed values
  - **When:** validation/business-rule checks run
  - **Then:** the request is rejected or unsupported fields are ignored per API contract, with protected values unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing protected-field test; Green: enforce editable-field allowlist; Refactor: extract field mutation policy if reused

### Service Update Behavior
- **Test:** service applies allowed field changes to the existing ticket
  - **Given:** an existing processing ticket and a valid payload with changed editable fields
  - **When:** update logic executes
  - **Then:** only the specified allowed fields are changed and unchanged fields remain intact
  - **Priority:** High
  - **TDD Phase:** Red: failing selective-update test; Green: map only allowed changes; Refactor: simplify patch/merge logic without broad abstraction too early

- **Test:** service does not persist when requested update results in no effective change
  - **Given:** an existing processing ticket and a payload identical to current editable values
  - **When:** update logic executes
  - **Then:** the result indicates no material change or idempotent success and avoids unnecessary write operations
  - **Priority:** Medium
  - **TDD Phase:** Red: failing no-op test; Green: compare incoming and current values; Refactor: extract diff utility if repeated

### Persistence and Audit-Relevant Behavior
- **Test:** successful update sets modified metadata
  - **Given:** a valid authorized update for a processing ticket
  - **When:** the update is applied
  - **Then:** modified-by and modified-at metadata are updated consistently with Golden Repo backend standards
  - **Priority:** High
  - **TDD Phase:** Red: failing audit-metadata test; Green: stamp metadata on successful change; Refactor: centralize audit stamping if common

- **Test:** failed update does not alter stored ticket data
  - **Given:** a validation, authorization, or business-rule failure
  - **When:** update logic completes
  - **Then:** the stored ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing non-mutation test; Green: ensure save occurs only on success; Refactor: wrap mutation flow in transaction boundary if needed

## Integration Test Specifications
### Update Ticket API Endpoint
- **Test:** API updates ticket information for authorized IT Support Agent when ticket is processing
  - **Given:** an authenticated IT Support Agent, an existing processing ticket, and a valid update payload
  - **When:** the client submits the ticket update API request
  - **Then:** the API returns success, the response reflects updated editable fields, and the database stores the changes
  - **Priority:** High

- **Test:** API rejects update from non-agent or insufficiently privileged caller
  - **Given:** an authenticated caller without IT Support Agent permissions
  - **When:** the client submits the ticket update API request
  - **Then:** the API returns forbidden/unauthorized and the database record is unchanged
  - **Priority:** High

- **Test:** API rejects update when ticket is not in processing
  - **Given:** an authenticated IT Support Agent and a ticket in a non-processing state
  - **When:** the update API request is submitted
  - **Then:** the API returns a business-rule error and no changes are persisted
  - **Priority:** High

- **Test:** API returns validation errors for invalid update payload
  - **Given:** an authenticated IT Support Agent and a malformed or invalid payload
  - **When:** the update API request is submitted
  - **Then:** the API returns structured validation errors consistent with Golden Repo standards and no changes are persisted
  - **Priority:** High

### Service and Repository Interaction
- **Test:** successful service execution persists only allowed ticket changes
  - **Given:** a valid authorized request routed through API, service, and repository layers
  - **When:** the update flow completes
  - **Then:** repository persistence contains only allowed field updates plus modified metadata
  - **Priority:** High

- **Test:** repository is not invoked for validation or authorization failures
  - **Given:** an invalid or unauthorized update request
  - **When:** the request flows through endpoint and service layers
  - **Then:** persistence write operations are not executed
  - **Priority:** High

### Transactional Consistency
- **Test:** update operation is atomic
  - **Given:** a valid update request and a downstream persistence failure during save
  - **When:** the update transaction is attempted
  - **Then:** no partial ticket changes are committed and the API/service reports failure
  - **Priority:** Medium

## Acceptance Test Scenarios
### US 1 / REQ-001
- **Scenario:** IT Support Agent updates ticket information during processing
  - **Given:** a ticket exists in processing state and the caller is an IT Support Agent
  - **When:** the caller submits valid updated ticket information
  - **Then:** the system saves the updated ticket information successfully

- **Scenario:** Non-agent cannot update ticket during processing
  - **Given:** a ticket exists in processing state and the caller is not an IT Support Agent
  - **When:** the caller attempts to update ticket information
  - **Then:** the system rejects the request and leaves the ticket unchanged

- **Scenario:** Ticket cannot be updated outside processing for this feature rule
  - **Given:** a ticket exists in a state other than processing and the caller is an IT Support Agent
  - **When:** the caller attempts to update ticket information
  - **Then:** the system rejects the request and leaves the ticket unchanged

- **Scenario:** Invalid ticket update data is rejected
  - **Given:** a ticket exists in processing state and the caller is an IT Support Agent
  - **When:** the caller submits invalid or unsupported ticket information
  - **Then:** the system returns validation errors and does not save changes

## Test-First Development Guidelines
1. **Red phase order**
   1. Write failing unit test for authorized IT Support Agent updating a processing ticket successfully.
   2. Write failing unit test for non-agent rejection.
   3. Write failing unit test for non-processing state rejection.
   4. Write failing unit tests for required-field and invalid-field validation.
   5. Write failing unit test for protected/immutable field rejection.
   6. Write failing unit test for selective field update and modified metadata.
   7. Write failing integration test for successful API update.
   8. Write failing integration tests for forbidden, invalid-state, and validation-error responses.
   9. Write failing integration test for atomic rollback on persistence failure.

2. **Green phase implementation sequence**
   1. Add minimal endpoint contract and request routing.
   2. Add authorization check for IT Support Agent role.
   3. Add processing-state business rule.
   4. Add request validation per contract and Golden Repo error formatting expectations.
   5. Add minimal update/merge logic for allowed editable fields only.
   6. Add repository save and modified metadata stamping.
   7. Add transactional handling for save failures.
   8. Run full suite after each increment; do not implement extra fields or rules not covered by tests.

3. **Refactor phase considerations**
   - Keep controller thin; move business rules into service/domain layer.
   - Extract shared validators/policies only after repetition appears at least three times.
   - Standardize error/result mapping for authorization, validation, not-found, and business-rule failures.
   - Preserve audit metadata behavior and transaction boundaries during cleanup.
   - Re-run full unit and integration suite after every refactor step.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Update with maximum allowed field lengths succeeds; exceeding limits fails.
  - Partial update with a minimal valid payload succeeds if API contract permits partial modification.
  - Empty update payload is rejected or treated as no-op per contract, with explicit test coverage.
  - Ticket not found by identifier returns not-found and does not attempt save.

- Error handling tests
  - Malformed request body returns validation/parsing error.
  - Attempt to update immutable/system-managed fields is rejected or ignored per contract, but never changes stored protected values.
  - Concurrently deleted or missing ticket at save time returns a safe failure outcome.
  - Persistence exception is translated to a controlled service/API error without leaking internal details.

- Concurrency/timing tests (if applicable)
  - Two agents updating the same processing ticket concurrently should enforce the repository’s configured consistency rule: optimistic conflict, last-write-wins, or equivalent documented behavior.
  - Stale version/update token, if used by Golden Repo standards, is rejected with conflict and no unintended overwrite.
  - Modified-at timestamp changes only on successful committed update, not on rejected attempts.