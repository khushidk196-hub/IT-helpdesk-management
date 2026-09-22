# TDD Test Specifications: Ticket Assignment And Updates

## Overview
These tests validate backend behavior for ticket viewing, assignment, and updates for IT support agents in a monolith architecture. The test suite should be written test-first for API endpoints, application/service logic, validation, persistence, and authorization boundaries inferred from the feature scope and requirement references REQ-001, REQ-002, and REQ-003.

Apply Red → Green → Refactor per acceptance criterion in sequence:
1. View tickets
2. Assign tickets
3. Update tickets

Assumed Golden Repo standards to enforce where source is silent:
- Validate required identifiers and payload fields.
- Reject malformed requests with clear validation errors.
- Enforce role/permission checks for support-agent actions.
- Persist only allowed field changes.
- Return deterministic API responses and appropriate error outcomes.
- Prevent unintended data mutation.

## Unit Test Specifications

### Ticket Viewing
- **Test:** returns ticket details for a valid ticket requested by a support agent
  - **Given:** an existing ticket and a requester with support-agent access
  - **When:** the view-ticket service is invoked with a valid ticket identifier
  - **Then:** the service returns the ticket’s persisted data without modification
  - **Priority:** High
  - **TDD Phase:** Red: write expectation for successful retrieval; Green: implement minimal query/authorization path; Refactor: extract shared ticket lookup only if reused 3+ times

- **Test:** returns ticket collection visible to support agents
  - **Given:** multiple existing tickets and a requester with support-agent access
  - **When:** the list-tickets service is invoked
  - **Then:** the service returns the available tickets in the defined response shape
  - **Priority:** High
  - **TDD Phase:** Red: fail on missing list behavior; Green: implement minimal retrieval; Refactor: centralize mapping if repeated

- **Test:** rejects view request when ticket identifier is missing or malformed
  - **Given:** a requester with support-agent access and an invalid ticket identifier input
  - **When:** the view-ticket service is invoked
  - **Then:** validation fails and no repository lookup occurs
  - **Priority:** High
  - **TDD Phase:** Red: assert validation error; Green: add identifier validation; Refactor: reuse validation primitive if pattern appears

- **Test:** returns not found when the requested ticket does not exist
  - **Given:** a requester with support-agent access and a non-existent ticket identifier
  - **When:** the view-ticket service is invoked
  - **Then:** a not-found result is returned
  - **Priority:** High
  - **TDD Phase:** Red: fail on absent ticket path; Green: implement not-found handling; Refactor: consolidate domain error mapping if reused

- **Test:** denies ticket viewing for a requester without support-agent permission
  - **Given:** an existing ticket and a requester lacking required permission
  - **When:** the view-ticket service is invoked
  - **Then:** access is denied and ticket data is not returned
  - **Priority:** High
  - **TDD Phase:** Red: assert authorization failure; Green: add permission check; Refactor: move common authorization rule into policy service if reused 3+ times

### Ticket Assignment
- **Test:** assigns an existing ticket to a valid support agent
  - **Given:** an unassigned or assignable ticket, a valid assignee, and a requester with support-agent access
  - **When:** the assign-ticket service is invoked with valid identifiers
  - **Then:** the ticket assignee is updated and persisted
  - **Priority:** High
  - **TDD Phase:** Red: assert assignee change; Green: implement minimal assignment logic and save; Refactor: isolate assignment rule logic if reused

- **Test:** rejects assignment when ticket identifier is missing or malformed
  - **Given:** a valid requester and an invalid ticket identifier
  - **When:** the assign-ticket service is invoked
  - **Then:** validation fails and no update is attempted
  - **Priority:** High
  - **TDD Phase:** Red: assert validation failure; Green: add request validation; Refactor: share validator with other commands where appropriate

- **Test:** rejects assignment when assignee identifier is missing or malformed
  - **Given:** a valid requester, valid ticket identifier, and invalid assignee identifier
  - **When:** the assign-ticket service is invoked
  - **Then:** validation fails and no update is attempted
  - **Priority:** High
  - **TDD Phase:** Red: assert validation failure; Green: implement assignee validation; Refactor: consolidate identifier checks

- **Test:** returns not found when assigning a non-existent ticket
  - **Given:** a valid requester and a non-existent ticket identifier
  - **When:** the assign-ticket service is invoked
  - **Then:** a not-found result is returned and no persistence occurs
  - **Priority:** High
  - **TDD Phase:** Red: assert missing ticket path; Green: implement lookup guard; Refactor: reuse lookup helper if repeated

- **Test:** rejects assignment to a non-existent or ineligible assignee
  - **Given:** an existing ticket and an assignee identifier not resolvable to an eligible support agent
  - **When:** the assign-ticket service is invoked
  - **Then:** validation/business rule failure is returned and the ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid assignee outcome; Green: implement assignee existence/eligibility rule; Refactor: extract agent eligibility rule if reused

- **Test:** denies assignment for a requester without assignment permission
  - **Given:** an existing ticket, a valid assignee, and a requester lacking required permission
  - **When:** the assign-ticket service is invoked
  - **Then:** access is denied and no update is persisted
  - **Priority:** High
  - **TDD Phase:** Red: assert authorization failure; Green: add permission check; Refactor: unify authorization policy application

- **Test:** preserves all non-assignment fields during assignment
  - **Given:** an existing ticket with populated fields
  - **When:** the assign-ticket service updates only the assignee
  - **Then:** all unrelated ticket fields remain unchanged
  - **Priority:** Medium
  - **TDD Phase:** Red: assert unintended mutation does not occur; Green: implement targeted update; Refactor: use patch/update mapper if repeated

### Ticket Updates
- **Test:** updates allowed ticket fields for a valid request
  - **Given:** an existing ticket, a requester with support-agent access, and a valid update payload
  - **When:** the update-ticket service is invoked
  - **Then:** only allowed fields are changed and the ticket is persisted
  - **Priority:** High
  - **TDD Phase:** Red: assert field changes; Green: implement minimal update logic; Refactor: extract field-level update policy if reused

- **Test:** rejects update when ticket identifier is missing or malformed
  - **Given:** a valid requester and an invalid ticket identifier
  - **When:** the update-ticket service is invoked
  - **Then:** validation fails and no lookup/update occurs
  - **Priority:** High
  - **TDD Phase:** Red: assert validation failure; Green: add identifier validation; Refactor: consolidate shared command validation

- **Test:** rejects update when payload is empty
  - **Given:** an existing ticket and a requester with support-agent access
  - **When:** the update-ticket service is invoked with no mutable fields
  - **Then:** validation fails and the ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: assert empty-update failure; Green: enforce non-empty command rule; Refactor: centralize command validation if reused

- **Test:** rejects update containing disallowed fields
  - **Given:** an existing ticket and an update payload containing immutable or unsupported fields
  - **When:** the update-ticket service is invoked
  - **Then:** validation/business rule failure is returned and disallowed fields are not persisted
  - **Priority:** High
  - **TDD Phase:** Red: assert blocked field update; Green: whitelist mutable fields; Refactor: extract allowed-field specification

- **Test:** returns not found when updating a non-existent ticket
  - **Given:** a valid requester and a non-existent ticket identifier
  - **When:** the update-ticket service is invoked
  - **Then:** a not-found result is returned
  - **Priority:** High
  - **TDD Phase:** Red: assert missing ticket outcome; Green: implement lookup guard; Refactor: reuse error mapping

- **Test:** denies updates for a requester without update permission
  - **Given:** an existing ticket and a requester lacking required permission
  - **When:** the update-ticket service is invoked
  - **Then:** access is denied and no changes are persisted
  - **Priority:** High
  - **TDD Phase:** Red: assert authorization failure; Green: add permission rule; Refactor: consolidate policy checks

- **Test:** preserves unchanged fields during partial update
  - **Given:** an existing ticket with multiple populated fields and a valid partial update
  - **When:** the update-ticket service is invoked
  - **Then:** only specified allowed fields are changed; all others remain unchanged
  - **Priority:** Medium
  - **TDD Phase:** Red: assert partial-update behavior; Green: implement selective mutation; Refactor: extract patch application logic if repeated

## Integration Test Specifications

### Ticket View API to Service to Repository
- **Test:** GET/list ticket endpoint returns tickets for authorized support agents
  - **Given:** persisted tickets and an authenticated support agent
  - **When:** the ticket view/list API is called
  - **Then:** the response is successful and contains persisted ticket data in the contract-defined shape
  - **Priority:** High

- **Test:** GET ticket endpoint returns not found for unknown ticket
  - **Given:** an authenticated support agent and an unknown ticket identifier
  - **When:** the view-ticket API is called
  - **Then:** the API returns the mapped not-found response
  - **Priority:** High

- **Test:** GET ticket endpoint rejects malformed identifier before repository access
  - **Given:** an authenticated support agent and malformed input
  - **When:** the view-ticket API is called
  - **Then:** the API returns a validation error response
  - **Priority:** High

- **Test:** GET/list ticket endpoint denies unauthorized requester
  - **Given:** a requester without support-agent permission
  - **When:** the ticket view/list API is called
  - **Then:** the API returns the mapped authorization failure response
  - **Priority:** High

### Ticket Assignment API to Service to Repository
- **Test:** assignment endpoint persists assignee change and returns updated ticket
  - **Given:** a persisted ticket, a valid support-agent assignee, and an authorized requester
  - **When:** the assign-ticket API is called
  - **Then:** the database reflects the new assignee and the response returns updated assignment data
  - **Priority:** High

- **Test:** assignment endpoint rejects invalid payload
  - **Given:** an authorized requester and an invalid assignment request
  - **When:** the assign-ticket API is called
  - **Then:** the API returns validation errors and no database mutation occurs
  - **Priority:** High

- **Test:** assignment endpoint returns not found for unknown ticket
  - **Given:** an authorized requester and a non-existent ticket identifier
  - **When:** the assign-ticket API is called
  - **Then:** the API returns not found and no mutation occurs
  - **Priority:** High

- **Test:** assignment endpoint rejects unknown or ineligible assignee
  - **Given:** an existing ticket and an assignee not resolvable to an eligible support agent
  - **When:** the assign-ticket API is called
  - **Then:** the API returns the mapped validation/business-rule error and the ticket remains unchanged
  - **Priority:** High

### Ticket Update API to Service to Repository
- **Test:** update endpoint persists allowed field changes
  - **Given:** a persisted ticket, an authorized requester, and a valid update payload
  - **When:** the update-ticket API is called
  - **Then:** the database contains only the allowed changes and the response returns updated data
  - **Priority:** High

- **Test:** update endpoint rejects empty or invalid update payload
  - **Given:** an authorized requester and an empty or malformed update request
  - **When:** the update-ticket API is called
  - **Then:** the API returns validation errors and no mutation occurs
  - **Priority:** High

- **Test:** update endpoint blocks disallowed field mutation
  - **Given:** a persisted ticket and an update payload including unsupported fields
  - **When:** the update-ticket API is called
  - **Then:** disallowed fields are rejected and persisted state remains unchanged for those fields
  - **Priority:** High

- **Test:** update endpoint denies unauthorized requester
  - **Given:** a requester lacking update permission
  - **When:** the update-ticket API is called
  - **Then:** the API returns authorization failure and no mutation occurs
  - **Priority:** High

## Acceptance Test Scenarios

### US 1: IT support agents can view tickets
- **Scenario:** support agent views available tickets
  - **Given:** one or more tickets exist and the requester is an IT support agent
  - **When:** the requester calls the ticket view/list API
  - **Then:** ticket data is returned successfully

- **Scenario:** support agent requests a specific existing ticket
  - **Given:** a ticket exists and the requester is an IT support agent
  - **When:** the requester calls the ticket detail API with that ticket identifier
  - **Then:** the requested ticket is returned

- **Scenario:** non-support requester cannot view tickets
  - **Given:** tickets exist and the requester lacks support-agent permission
  - **When:** the requester calls the ticket view/list API
  - **Then:** access is denied

### US 2: IT support agents can assign tickets
- **Scenario:** support agent assigns a ticket to a valid support agent
  - **Given:** a ticket exists, a valid assignee exists, and the requester is authorized
  - **When:** the requester calls the assign-ticket API with valid identifiers
  - **Then:** the ticket assignment is saved successfully

- **Scenario:** assignment fails for invalid request data
  - **Given:** a ticket assignment request contains missing or malformed required data
  - **When:** the requester calls the assign-ticket API
  - **Then:** the request is rejected with validation errors

- **Scenario:** unauthorized requester cannot assign tickets
  - **Given:** a ticket exists and the requester lacks assignment permission
  - **When:** the requester calls the assign-ticket API
  - **Then:** access is denied and the ticket remains unchanged

### US 3: IT support agents can update tickets
- **Scenario:** support agent updates allowed ticket details
  - **Given:** a ticket exists and the requester is authorized
  - **When:** the requester calls the update-ticket API with a valid payload
  - **Then:** the ticket changes are saved successfully

- **Scenario:** update fails for invalid or empty payload
  - **Given:** a ticket exists and the update request contains no valid mutable fields
  - **When:** the requester calls the update-ticket API
  - **Then:** the request is rejected with validation errors

- **Scenario:** unauthorized requester cannot update tickets
  - **Given:** a ticket exists and the requester lacks update permission
  - **When:** the requester calls the update-ticket API
  - **Then:** access is denied and the ticket remains unchanged

## Test-First Development Guidelines
1. Write failing authorization and validation tests first for view, assign, and update commands.
2. Write failing happy-path unit tests for:
   1. view existing ticket / list tickets
   2. assign ticket
   3. update ticket
3. Write failing not-found tests for each command/query.
4. Write failing tests for invalid assignee and disallowed update fields.
5. Write integration tests for endpoint-to-service-to-repository flow after core unit tests are green.
6. Add acceptance-scenario tests last to confirm end-to-end requirement coverage.

Implementation sequence recommendations (Green phase):
1. Implement minimal request validation.
2. Implement minimal authorization policy checks.
3. Implement ticket retrieval logic.
4. Implement assignment persistence logic.
5. Implement update logic with explicit mutable-field whitelist.
6. Implement API error mapping for validation, not found, and forbidden outcomes.
7. Run full suite after each increment; do not proceed with failing tests.

Refactoring considerations (Refactor phase):
- Extract shared ticket identifier validation across endpoints.
- Extract shared authorization policy only after repeated usage.
- Keep update logic explicit to avoid accidental mass assignment.
- Separate repository concerns from business rules.
- Apply Rule of Three before introducing generic command handlers or mappers.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Minimum valid ticket identifier format and maximum supported identifier length/shape.
  - Assignment/update requests with exactly one mutable field.
  - Large ticket list responses remain contract-compliant.
  - Partial update where new value equals existing value should not corrupt data.

- Error handling tests
  - Missing authentication/authorization context.
  - Unknown ticket identifier.
  - Unknown/ineligible assignee.
  - Empty request body, malformed body, or unsupported fields.
  - Repository failure or downstream persistence error is translated to the standard API error response without partial mutation.

- Concurrency/timing tests (if applicable)
  - Concurrent assignment requests for the same ticket produce a deterministic final persisted state according to repo locking/versioning policy.
  - Concurrent update and assignment requests do not silently overwrite unrelated fields.
  - Repeated identical assignment/update requests are handled consistently and do not duplicate side effects.