# TDD Test Specifications: Audit History

## Overview
These tests validate backend support for maintaining audit history for ticket-related activities in a monolith architecture. The scope covers API behavior, audit service/business rules, validation, persistence, and authorization for reading audit history.  

TDD approach:
1. Write failing tests for each audit event source and retrieval rule.
2. Implement the minimum logic to record and fetch audit entries.
3. Refactor only after tests are green, preserving traceability to REQ-002 and the audit history acceptance criterion.

## Unit Test Specifications

### Audit Event Creation
- **Test:** creates audit entry for ticket creation
  - **Given:** a valid ticket creation request and authenticated actor
  - **When:** the ticket is created
  - **Then:** an audit entry is produced with ticket identifier, action `CREATED`, actor identifier, timestamp, and initial field snapshot
  - **Priority:** High
  - **TDD Phase:** Red: assert audit entry exists after create; Green: add minimal audit record creation in ticket create flow; Refactor: extract shared audit entry builder if reused 3+ times

- **Test:** creates audit entry for ticket assignment
  - **Given:** an existing ticket and a valid assignee change
  - **When:** assignment is updated
  - **Then:** an audit entry is produced with action `ASSIGNED` and captures old and new assignee values
  - **Priority:** High
  - **TDD Phase:** Red: assert assignment change emits audit entry; Green: record before/after assignee values; Refactor: centralize change-diff formatting

- **Test:** creates audit entry for ticket update of tracked fields
  - **Given:** an existing ticket and a request changing tracked fields such as status, priority, or category
  - **When:** the update is applied
  - **Then:** an audit entry is produced with action `UPDATED` and only changed tracked fields are recorded as before/after values
  - **Priority:** High
  - **TDD Phase:** Red: fail on missing or incorrect field diff; Green: add minimal changed-field capture; Refactor: isolate tracked-field comparison service

- **Test:** creates audit entry for comment addition
  - **Given:** an existing ticket and a valid comment request
  - **When:** the comment is added
  - **Then:** an audit entry is produced with action `COMMENTED` and references the comment identifier without requiring full comment body duplication unless mandated
  - **Priority:** Medium
  - **TDD Phase:** Red: assert comment action is audited; Green: persist minimal comment audit metadata; Refactor: reuse event metadata mapping

- **Test:** creates audit entry for ticket resolution
  - **Given:** an existing ticket eligible for resolution
  - **When:** the ticket is resolved
  - **Then:** an audit entry is produced with action `RESOLVED` and records status transition and resolver identity
  - **Priority:** High
  - **TDD Phase:** Red: verify resolution action emits audit data; Green: add resolution audit logic; Refactor: align status-transition audit handling

### Audit Data Validation
- **Test:** rejects audit entry creation when required actor metadata is missing
  - **Given:** a ticket-related change is attempted without valid authenticated actor context
  - **When:** audit creation is invoked
  - **Then:** the operation fails according to security rules or no state change is committed without a valid audit trail
  - **Priority:** High
  - **TDD Phase:** Red: assert unauthenticated change cannot produce incomplete audit; Green: enforce actor requirement; Refactor: consolidate auth context validation

- **Test:** rejects audit persistence with missing required fields
  - **Given:** an audit entry missing required fields such as action, ticket identifier, or timestamp
  - **When:** persistence is attempted
  - **Then:** validation fails and the invalid audit entry is not stored
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid entry is rejected; Green: add minimal domain validation; Refactor: move invariant checks into audit entity/value object

- **Test:** does not create audit entry when no tracked field value changed
  - **Given:** an update request that results in no effective change to tracked ticket data
  - **When:** the update operation completes
  - **Then:** no redundant audit entry is created for a no-op update
  - **Priority:** Medium
  - **TDD Phase:** Red: assert no-op updates do not create history noise; Green: compare effective values before persisting; Refactor: standardize no-op detection

### Audit Retrieval Rules
- **Test:** returns audit history ordered by most recent timestamp first
  - **Given:** multiple audit entries exist for a ticket
  - **When:** audit history is requested
  - **Then:** entries are returned in a deterministic reverse-chronological order
  - **Priority:** High
  - **TDD Phase:** Red: assert ordering requirement; Green: apply minimal sort/order in query; Refactor: encapsulate ordering contract in repository/service

- **Test:** limits audit history to entries for the requested ticket only
  - **Given:** audit entries for multiple tickets
  - **When:** history is requested for one ticket
  - **Then:** only entries belonging to that ticket are returned
  - **Priority:** High
  - **TDD Phase:** Red: assert cross-ticket leakage fails; Green: filter by ticket identifier; Refactor: reuse scoped query method

- **Test:** denies audit history access to unauthorized roles
  - **Given:** a caller without permission to view the ticket or its audit history
  - **When:** audit history is requested
  - **Then:** access is denied and no audit data is disclosed
  - **Priority:** High
  - **TDD Phase:** Red: assert unauthorized request fails; Green: add minimal role/resource authorization check; Refactor: align with shared authorization policy

- **Test:** returns empty result when a ticket has no audit history
  - **Given:** a valid ticket with no audit entries
  - **When:** history is requested
  - **Then:** an empty collection is returned without error
  - **Priority:** Medium
  - **TDD Phase:** Red: assert empty history contract; Green: return empty collection; Refactor: normalize null/empty handling

### API Contract Validation
- **Test:** validates required ticket identifier on audit history request
  - **Given:** a request with missing or malformed ticket identifier
  - **When:** the audit history endpoint is called
  - **Then:** the API returns a validation error and does not query persistence
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid identifier is rejected; Green: add request validation; Refactor: share identifier validation rules

- **Test:** returns stable audit response schema
  - **Given:** an audit history request for a ticket with entries
  - **When:** the API responds
  - **Then:** each item includes required fields such as audit entry identifier, ticket identifier, action, actor, timestamp, and change details
  - **Priority:** Medium
  - **TDD Phase:** Red: assert required response fields; Green: map minimal domain fields to API contract; Refactor: extract response mapper when repeated

## Integration Test Specifications

### Ticket Workflow to Audit Persistence
- **Test:** ticket creation persists both ticket and audit entry atomically
  - **Given:** a valid create ticket request
  - **When:** the API processes the request
  - **Then:** the ticket and its corresponding `CREATED` audit entry are both committed, or neither is committed on failure
  - **Priority:** High

- **Test:** ticket update persists changed ticket state and matching audit diff
  - **Given:** an existing ticket and a valid update request
  - **When:** the API updates the ticket
  - **Then:** the persisted audit entry reflects the same before/after values as the stored ticket change
  - **Priority:** High

- **Test:** assignment change writes assignment audit record through full stack
  - **Given:** an authorized assignment request
  - **When:** the assignment API is called
  - **Then:** the response succeeds and a persisted `ASSIGNED` audit entry is retrievable for that ticket
  - **Priority:** High

- **Test:** comment creation writes comment audit record through full stack
  - **Given:** an authorized comment request on an existing ticket
  - **When:** the comment API is called
  - **Then:** the comment is stored and a corresponding `COMMENTED` audit entry is retrievable
  - **Priority:** Medium

### Audit History Retrieval API
- **Test:** audit history endpoint returns persisted entries in expected order
  - **Given:** a ticket with multiple stored audit entries
  - **When:** the audit history API is called
  - **Then:** the API returns the persisted entries in reverse-chronological order with correct payload structure
  - **Priority:** High

- **Test:** audit history endpoint enforces authorization before data access
  - **Given:** a caller lacking access to the ticket
  - **When:** the audit history API is called
  - **Then:** the request is rejected and no ticket audit data is returned
  - **Priority:** High

- **Test:** audit history endpoint isolates data by ticket id
  - **Given:** audit entries exist for several tickets
  - **When:** history is requested for one ticket
  - **Then:** the endpoint returns only entries for that ticket
  - **Priority:** High

### Failure and Transaction Handling
- **Test:** ticket change is not committed when audit persistence fails
  - **Given:** a valid ticket update request and a simulated audit persistence failure
  - **When:** the API processes the update
  - **Then:** the overall operation fails and the ticket state remains unchanged
  - **Priority:** High

- **Test:** audit retrieval handles nonexistent ticket according to API resource rules
  - **Given:** a well-formed request for a nonexistent ticket identifier
  - **When:** the audit history API is called
  - **Then:** the API returns the defined not-found outcome without exposing unrelated audit data
  - **Priority:** Medium

## Acceptance Test Scenarios

### US 1 / REQ-002 Audit History Support
- **Scenario:** audit history is recorded for ticket creation
  - **Given:** an authenticated user submits a valid ticket creation request
  - **When:** the ticket is created successfully
  - **Then:** the system stores an audit record for the creation activity

- **Scenario:** audit history is recorded for ticket assignment and updates
  - **Given:** an existing ticket and an authorized user
  - **When:** the user changes assignment or tracked ticket fields
  - **Then:** the system stores audit records describing those changes

- **Scenario:** audit history is recorded for comments and resolution
  - **Given:** an existing ticket and an authorized user
  - **When:** the user adds a comment or resolves the ticket
  - **Then:** the system stores audit records for those activities

- **Scenario:** authorized users can retrieve ticket audit history
  - **Given:** a ticket with recorded audit entries
  - **When:** an authorized user requests audit history for that ticket
  - **Then:** the system returns the ticket’s audit trail in a consistent order

- **Scenario:** unauthorized users cannot retrieve ticket audit history
  - **Given:** a ticket with recorded audit entries
  - **When:** a user without required access requests audit history
  - **Then:** the system denies access and does not disclose audit data

- **Scenario:** invalid audit history requests are rejected
  - **Given:** a request with a missing or malformed ticket identifier
  - **When:** the audit history endpoint is called
  - **Then:** the system returns a validation error

## Test-First Development Guidelines
1. **Red phase order**
   1. Write failing unit test for `CREATED` audit entry on ticket creation.
   2. Write failing unit test for retrieval by ticket id only.
   3. Write failing unit test for reverse-chronological ordering.
   4. Write failing unit test for `ASSIGNED` and `UPDATED` before/after diffs.
   5. Write failing unit test for `COMMENTED` and `RESOLVED`.
   6. Write failing unit test for authorization on audit retrieval.
   7. Write failing unit test for no-op updates producing no audit entry.
   8. Write failing validation tests for missing actor context and invalid ticket id.
   9. Add integration test for atomic ticket change + audit persistence.
   10. Add integration tests for retrieval endpoint behavior and failure rollback.

2. **Green phase implementation sequence**
   1. Implement minimal audit domain model with required fields only.
   2. Add audit creation to ticket creation flow.
   3. Add repository/query support for fetch by ticket id with ordering.
   4. Add minimal API endpoint for history retrieval.
   5. Add audit hooks for assignment, tracked updates, comments, and resolution.
   6. Add authorization and request validation.
   7. Add transaction protection so business change and audit write succeed/fail together.

3. **Refactor phase considerations**
   - Extract shared audit entry factory only after repeated event mapping appears at least 3 times.
   - Consolidate field-diff generation into a dedicated service if reused across multiple update types.
   - Keep controller/API layer thin; business rules belong in services/use cases.
   - Preserve domain invariants for required audit metadata.
   - Re-run all unit and integration tests after each refactor step.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Requesting history for a ticket with zero audit entries returns an empty collection.
  - Requesting history for a ticket with many audit entries still returns correct ordering and ticket scoping.
  - Updating a ticket with unchanged values creates no audit record.
  - Changing multiple tracked fields in one request creates one coherent audit entry with all changed fields.

- Error handling tests
  - Missing or malformed ticket identifier returns validation error.
  - Unauthenticated or unauthorized callers cannot retrieve audit history.
  - Ticket-related mutations without valid actor context are rejected or rolled back to avoid incomplete audit trail.
  - Persistence failure for audit logging prevents partial success of the ticket mutation.
  - Nonexistent ticket requests return the defined not-found response.

- Concurrency/timing tests (if applicable)
  - Concurrent updates to the same ticket produce distinct audit entries for each committed change.
  - Audit timestamps are recorded for each committed action and ordering remains deterministic even for closely timed events.
  - Concurrent retrieval during updates does not return cross-ticket or partially committed audit data.