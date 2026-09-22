# TDD Test Specifications: Agent Ticket Operations

## Overview
These tests validate backend behavior for support-agent ticket operations in a monolith architecture: viewing, assigning, updating, commenting, investigating, and resolving tickets.

TDD approach:
1. Write failing tests for each acceptance criterion and validation rule.
2. Implement the minimum API/service/database behavior to pass.
3. Refactor only after tests are green, preserving behavior.

Assumed Golden Repo expectations applied as backend constraints:
- Strong input validation for request payloads and identifiers.
- Clear authorization boundaries for agent-only actions.
- Consistent error handling for not found, invalid state transitions, and validation failures.
- Persistence and retrieval must be verifiable through integration tests.
- Audit-relevant actions should be traceable through stored state changes/comments/history where applicable.

## Unit Test Specifications

### Ticket Viewing
- **Test:** agent can retrieve a single ticket by valid identifier
  - **Given:** an existing ticket and an authenticated support agent
  - **When:** the agent requests the ticket details
  - **Then:** the service returns the ticket with current status, assignee, comments summary, and investigation/resolution fields if present
  - **Priority:** High
  - **TDD Phase:** Red: write failing retrieval test; Green: implement minimal lookup/authorization; Refactor: extract shared ticket-mapping logic only if reused 3+ times

- **Test:** agent can retrieve a list of tickets
  - **Given:** multiple existing tickets and an authenticated support agent
  - **When:** the agent requests ticket listing
  - **Then:** the service returns a collection of tickets with stable minimal fields needed for agent operations
  - **Priority:** High
  - **TDD Phase:** Red: failing list test; Green: implement minimal query; Refactor: consolidate pagination/filter defaults if repeated

- **Test:** viewing a non-existent ticket returns not found
  - **Given:** an authenticated support agent and an unknown ticket identifier
  - **When:** the agent requests the ticket
  - **Then:** the service returns a not-found error and no side effects occur
  - **Priority:** High
  - **TDD Phase:** Red: failing not-found test; Green: implement existence check; Refactor: centralize not-found handling if pattern repeats

- **Test:** invalid ticket identifier is rejected during view request
  - **Given:** an authenticated support agent and a malformed or empty ticket identifier
  - **When:** the agent requests ticket details
  - **Then:** validation fails with a client error and repository lookup is not attempted
  - **Priority:** High
  - **TDD Phase:** Red: failing validation test; Green: add request validation; Refactor: reuse identifier validation across endpoints

### Ticket Assignment
- **Test:** agent can assign an unassigned ticket to a valid support agent
  - **Given:** an existing unassigned ticket and a valid target agent
  - **When:** an assignment request is submitted
  - **Then:** the ticket assignee is updated and assignment metadata is persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing assignment test; Green: implement minimal assignment logic; Refactor: extract assignment policy if reused

- **Test:** agent can reassign a ticket to another valid support agent
  - **Given:** an existing assigned ticket and another valid target agent
  - **When:** a reassignment request is submitted
  - **Then:** the ticket assignee changes to the new agent and prior assignment is replaced according to business rules
  - **Priority:** High
  - **TDD Phase:** Red: failing reassignment test; Green: implement update logic; Refactor: isolate assignee validation logic

- **Test:** assignment fails when target agent does not exist or is not eligible
  - **Given:** an existing ticket and an invalid or ineligible target agent
  - **When:** an assignment request is submitted
  - **Then:** validation/business-rule failure is returned and the ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing eligibility test; Green: add target-agent validation; Refactor: reuse agent eligibility policy

- **Test:** assignment request with missing required fields is rejected
  - **Given:** an authenticated support agent and an incomplete assignment payload
  - **When:** the assignment request is submitted
  - **Then:** validation errors are returned and no persistence occurs
  - **Priority:** High
  - **TDD Phase:** Red: failing payload validation test; Green: implement schema validation; Refactor: consolidate request validators

### Ticket Updates
- **Test:** agent can update allowed ticket fields
  - **Given:** an existing ticket and a valid update payload for editable fields
  - **When:** the agent submits the update
  - **Then:** only allowed fields are changed and persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing update test; Green: implement minimal field updates; Refactor: extract allow-list logic

- **Test:** update rejects disallowed or immutable fields
  - **Given:** an existing ticket and a payload containing restricted fields
  - **When:** the update is submitted
  - **Then:** the request fails validation or restricted fields are ignored per policy, and protected values do not change
  - **Priority:** High
  - **TDD Phase:** Red: failing immutable-field test; Green: enforce field restrictions; Refactor: centralize update-policy rules

- **Test:** update rejects invalid field values
  - **Given:** an existing ticket and invalid values such as empty required text, malformed enums, or oversized content
  - **When:** the update is submitted
  - **Then:** validation errors are returned and the ticket is unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-value test; Green: add field validation; Refactor: reuse common validators

### Ticket Comments
- **Test:** agent can add a comment to an existing ticket
  - **Given:** an existing ticket and a valid comment payload from an authenticated support agent
  - **When:** the comment is submitted
  - **Then:** the comment is persisted and associated with the ticket and author
  - **Priority:** High
  - **TDD Phase:** Red: failing add-comment test; Green: implement minimal create-comment flow; Refactor: extract shared note/comment persistence logic if repeated

- **Test:** comment content must meet validation rules
  - **Given:** an existing ticket and an empty, null, or oversized comment body
  - **When:** the comment is submitted
  - **Then:** validation fails and no comment is stored
  - **Priority:** High
  - **TDD Phase:** Red: failing comment validation test; Green: enforce content rules; Refactor: reuse text validation helpers

- **Test:** commenting on a non-existent ticket returns not found
  - **Given:** an unknown ticket identifier and a valid comment payload
  - **When:** the comment is submitted
  - **Then:** a not-found error is returned and no orphaned record is created
  - **Priority:** High
  - **TDD Phase:** Red: failing orphan-comment test; Green: check parent existence before write; Refactor: standardize parent-entity guards

### Investigation
- **Test:** agent can record investigation details on a ticket
  - **Given:** an existing ticket and valid investigation details
  - **When:** the investigation update is submitted
  - **Then:** investigation notes/status are persisted on the ticket or related record per domain model
  - **Priority:** High
  - **TDD Phase:** Red: failing investigation test; Green: implement minimal persistence; Refactor: separate investigation domain service if logic grows

- **Test:** investigation update requires valid content
  - **Given:** an existing ticket and invalid investigation payload
  - **When:** the investigation update is submitted
  - **Then:** validation fails and no investigation data changes
  - **Priority:** Medium
  - **TDD Phase:** Red: failing investigation validation test; Green: enforce rules; Refactor: reuse domain validation components

### Resolution
- **Test:** agent can resolve a ticket with required resolution details
  - **Given:** an existing unresolved ticket and a valid resolution payload
  - **When:** the resolve action is submitted
  - **Then:** the ticket status changes to resolved and resolution details are persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing resolve test; Green: implement minimal resolution transition; Refactor: extract status-transition policy after repeated use

- **Test:** resolution fails when required resolution details are missing
  - **Given:** an existing unresolved ticket and an incomplete resolution payload
  - **When:** the resolve action is submitted
  - **Then:** validation fails and the ticket remains unresolved
  - **Priority:** High
  - **TDD Phase:** Red: failing resolution validation test; Green: enforce required fields; Refactor: reuse resolution validator

- **Test:** resolved ticket cannot be resolved again if state transition is invalid
  - **Given:** an already resolved ticket
  - **When:** a resolve action is submitted again
  - **Then:** the service rejects the invalid transition and preserves existing resolution data
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-transition test; Green: enforce transition rules; Refactor: centralize ticket lifecycle rules

### Authorization and Access Control
- **Test:** non-agent caller cannot perform agent ticket operations
  - **Given:** an authenticated caller without support-agent permissions
  - **When:** the caller attempts view/assign/update/comment/investigate/resolve actions
  - **Then:** access is denied and no data changes occur
  - **Priority:** High
  - **TDD Phase:** Red: failing authorization tests for critical endpoints first; Green: add role checks; Refactor: consolidate authorization policy

- **Test:** unauthenticated caller cannot perform agent ticket operations
  - **Given:** no authenticated identity
  - **When:** any agent ticket operation is requested
  - **Then:** authentication failure is returned and no repository interaction occurs beyond permitted security middleware behavior
  - **Priority:** High
  - **TDD Phase:** Red: failing unauthenticated test; Green: enforce auth requirement; Refactor: standardize endpoint security configuration

## Integration Test Specifications

### Ticket API Endpoints
- **Test:** GET ticket details returns persisted ticket data for authorized agent
  - **Given:** a persisted ticket and an authorized support agent
  - **When:** the ticket details API is called
  - **Then:** the response matches stored ticket data and returns the expected success status
  - **Priority:** High

- **Test:** GET ticket list returns persisted tickets for authorized agent
  - **Given:** persisted tickets visible to support agents
  - **When:** the ticket list API is called
  - **Then:** the response contains the expected ticket collection and structure
  - **Priority:** High

### Assignment Flow
- **Test:** assignment API updates ticket assignee in persistence layer
  - **Given:** a persisted ticket and a valid target agent
  - **When:** the assign API is called
  - **Then:** the API returns success and the database reflects the new assignee
  - **Priority:** High

- **Test:** assignment API rejects invalid target agent and preserves stored ticket state
  - **Given:** a persisted ticket and an invalid target agent reference
  - **When:** the assign API is called
  - **Then:** the API returns a validation/business error and no assignment change is persisted
  - **Priority:** High

### Update and Comment Flow
- **Test:** update API persists allowed field changes only
  - **Given:** a persisted ticket and a valid update payload
  - **When:** the update API is called
  - **Then:** allowed fields are changed in storage and restricted fields remain unchanged
  - **Priority:** High

- **Test:** comment API creates a ticket-linked comment record
  - **Given:** a persisted ticket and a valid comment payload
  - **When:** the comment API is called
  - **Then:** the response returns success and the comment is stored with correct ticket and author linkage
  - **Priority:** High

### Investigation and Resolution Flow
- **Test:** investigation API persists investigation details for an existing ticket
  - **Given:** a persisted ticket and valid investigation data
  - **When:** the investigation API is called
  - **Then:** the stored ticket or related investigation record reflects the submitted details
  - **Priority:** Medium

- **Test:** resolution API changes ticket state to resolved and stores resolution details
  - **Given:** a persisted unresolved ticket and a valid resolution payload
  - **When:** the resolve API is called
  - **Then:** the ticket status becomes resolved and resolution data is persisted atomically
  - **Priority:** High

- **Test:** resolution API rejects invalid state transition
  - **Given:** a persisted resolved ticket
  - **When:** the resolve API is called again
  - **Then:** the API returns a business-rule error and stored state remains unchanged
  - **Priority:** High

### Security and Validation
- **Test:** protected ticket endpoints reject unauthenticated requests
  - **Given:** no authenticated identity
  - **When:** protected ticket APIs are called
  - **Then:** authentication failure is returned consistently across endpoints
  - **Priority:** High

- **Test:** protected ticket endpoints reject unauthorized non-agent requests
  - **Given:** an authenticated non-agent identity
  - **When:** protected ticket APIs are called
  - **Then:** authorization failure is returned consistently across endpoints
  - **Priority:** High

- **Test:** invalid payloads return validation errors without partial writes
  - **Given:** malformed or incomplete payloads for assign/update/comment/investigate/resolve APIs
  - **When:** the APIs are called
  - **Then:** validation errors are returned and persistence remains unchanged
  - **Priority:** High

## Acceptance Test Scenarios

### US 1 - IT support agents must be able to view, assign, update, comment on, investigate, and resolve tickets
- **Scenario:** support agent views ticket details
  - **Given:** a ticket exists and the caller is an authenticated support agent
  - **When:** the agent requests the ticket
  - **Then:** the system returns the ticket details

- **Scenario:** support agent assigns a ticket
  - **Given:** a ticket exists and a valid support agent assignee exists
  - **When:** an authenticated support agent submits an assignment request
  - **Then:** the ticket is assigned to the target agent

- **Scenario:** support agent updates a ticket
  - **Given:** a ticket exists and the caller is an authenticated support agent
  - **When:** the agent submits valid updates to editable ticket fields
  - **Then:** the ticket is updated successfully

- **Scenario:** support agent adds a comment to a ticket
  - **Given:** a ticket exists and the caller is an authenticated support agent
  - **When:** the agent submits a valid comment
  - **Then:** the comment is stored against the ticket

- **Scenario:** support agent records investigation details
  - **Given:** a ticket exists and the caller is an authenticated support agent
  - **When:** the agent submits valid investigation information
  - **Then:** the investigation details are stored for the ticket

- **Scenario:** support agent resolves a ticket
  - **Given:** a ticket exists, is not already resolved, and the caller is an authenticated support agent
  - **When:** the agent submits valid resolution details
  - **Then:** the ticket is marked resolved and the resolution is stored

- **Scenario:** invalid or unauthorized ticket operations are rejected
  - **Given:** a malformed request, invalid ticket reference, invalid state transition, or non-agent caller
  - **When:** an operation is submitted
  - **Then:** the system rejects the request with the appropriate error and does not corrupt ticket state

## Test-First Development Guidelines
1. Write Red-phase tests in this order:
   1. Authorization/authentication for all agent endpoints.
   2. View single ticket success and not-found.
   3. Assign ticket success and invalid target agent.
   4. Update ticket success and restricted-field rejection.
   5. Add comment success and comment validation failure.
   6. Investigation success and validation failure.
   7. Resolve ticket success, missing-resolution-details failure, invalid transition failure.
   8. List tickets and grouped payload validation tests.

2. Green-phase implementation sequence:
   1. Add endpoint security and request identity checks.
   2. Implement ticket retrieval service/repository calls.
   3. Implement assignment workflow with target-agent validation.
   4. Implement update workflow with editable-field allow-list.
   5. Implement comment creation with parent-ticket existence checks.
   6. Implement investigation persistence.
   7. Implement resolution state transition and resolution-detail persistence.
   8. Add consistent validation and error mapping across endpoints.

3. Refactor-phase considerations:
   - Centralize ticket identifier validation and standard error responses.
   - Extract authorization and lifecycle/state-transition policies.
   - Consolidate shared payload validation logic.
   - Introduce shared repository/service abstractions only after Rule of Three is met.
   - Re-run the full suite after each refactor step; do not refactor with failing tests.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Minimum/maximum allowed lengths for comments, investigation notes, and resolution text.
  - Empty, null, whitespace-only, and malformed identifiers/payload fields.
  - Large ticket lists, if list endpoint supports pagination or limits.
  - Updates containing a mix of valid editable fields and invalid restricted fields.

- Error handling tests
  - Ticket not found for view/assign/update/comment/investigate/resolve actions.
  - Assignee does not exist or is not eligible.
  - Invalid enum/status values in update or resolution requests.
  - Attempt to resolve an already resolved ticket.
  - Validation failures must not create comments, partial updates, or partial state transitions.
  - Consistent error shape/message/category across all endpoints per Golden Repo standards.

- Concurrency/timing tests (if applicable)
  - Concurrent assignment requests on the same ticket should not leave inconsistent assignee state.
  - Concurrent update and resolve actions should preserve valid final state according to transaction/order rules.
  - Repeated comment submission with the same request should not create unintended duplicates if idempotency is expected by platform standards.
  - Simultaneous resolution attempts should result in only one valid resolution transition and no corrupted state.