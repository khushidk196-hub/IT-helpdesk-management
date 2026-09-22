# TDD Test Specifications: Ticket Assignment

## Overview
These tests validate backend behavior for assigning ticket ownership to an IT Support Agent and exposing the assignee on the ticket record. The scope covers API endpoint behavior, service/business rules, request validation, persistence, and integrated retrieval of assignment data in a monolith architecture.

All tests should be written test-first and executed in strict Red → Green → Refactor order for each acceptance criterion. Since the source acceptance criteria are concise, the test set below applies standard backend validation expectations: required fields, entity existence, authorization/role enforcement, idempotent update behavior, persistence integrity, and clear error handling.

## Unit Test Specifications

### Assignment Request Validation
- **Test:** reject assignment when ticket identifier is missing or invalid
  - **Given:** an assignment request without a valid ticket identifier
  - **When:** the assignment command is validated
  - **Then:** validation fails and no assignment operation is invoked
  - **Priority:** High
  - **TDD Phase:** Red: add failing validation test; Green: implement minimum request validation; Refactor: centralize shared identifier validation only if reused 3+ times

- **Test:** reject assignment when assignee identifier is missing or invalid
  - **Given:** an assignment request without a valid assignee identifier
  - **When:** the assignment command is validated
  - **Then:** validation fails and no assignment operation is invoked
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test; Green: add minimum assignee field validation; Refactor: keep validation rules cohesive and DRY

- **Test:** reject assignment when acting user context is missing
  - **Given:** an assignment request with no authenticated actor context
  - **When:** the service evaluates the request
  - **Then:** the request is rejected as unauthorized
  - **Priority:** High
  - **TDD Phase:** Red: create failing authorization precondition test; Green: enforce actor presence; Refactor: extract auth guard only after repeated usage

### Assignment Authorization & Business Rules
- **Test:** allow assignment when actor is an IT Support Agent
  - **Given:** an existing ticket, an existing target assignee, and an authenticated IT Support Agent
  - **When:** the assignment service handles the request
  - **Then:** the ticket assignee is updated successfully
  - **Priority:** High
  - **TDD Phase:** Red: failing happy-path service test; Green: implement minimum role check and update; Refactor: isolate policy logic if repeated

- **Test:** reject assignment when actor is not an IT Support Agent
  - **Given:** an existing ticket, an existing target assignee, and an authenticated user without IT Support Agent privileges
  - **When:** the assignment service handles the request
  - **Then:** the operation is forbidden and the ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing forbidden test; Green: implement minimum role enforcement; Refactor: consolidate authorization rules

- **Test:** reject assignment when ticket does not exist
  - **Given:** a valid assignee and a ticket identifier not found in storage
  - **When:** the assignment service handles the request
  - **Then:** a not-found result is returned and nothing is persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing missing-ticket test; Green: add ticket existence check; Refactor: unify not-found handling

- **Test:** reject assignment when assignee does not exist
  - **Given:** an existing ticket and an assignee identifier not found in storage
  - **When:** the assignment service handles the request
  - **Then:** a validation or not-found result is returned and the ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing missing-assignee test; Green: add assignee existence check; Refactor: align error semantics consistently

- **Test:** update assignee when assigning a currently unassigned ticket
  - **Given:** an existing unassigned ticket and a valid IT Support Agent assignee
  - **When:** the assignment service handles the request
  - **Then:** the ticket owner becomes the specified assignee
  - **Priority:** High
  - **TDD Phase:** Red: failing unassigned-ticket test; Green: implement minimum state update; Refactor: keep state transitions explicit

- **Test:** replace assignee when reassigning an already assigned ticket
  - **Given:** an existing ticket with a current assignee and a new valid IT Support Agent assignee
  - **When:** the assignment service handles the request
  - **Then:** the prior assignee is replaced by the new assignee
  - **Priority:** High
  - **TDD Phase:** Red: failing reassignment test; Green: implement overwrite behavior; Refactor: extract assignment mutation logic if repeated

- **Test:** keep assignment unchanged when assigning to the same assignee
  - **Given:** an existing ticket already assigned to the requested assignee
  - **When:** the assignment service handles the request
  - **Then:** the operation succeeds or returns a no-op result consistently, with no duplicate side effects
  - **Priority:** Medium
  - **TDD Phase:** Red: failing idempotency test; Green: implement stable same-value behavior; Refactor: standardize no-op responses

### Ticket Record Representation
- **Test:** include assignee on ticket domain output after assignment
  - **Given:** a ticket with an assigned owner
  - **When:** the ticket record is mapped to response output
  - **Then:** assignee details are present in the returned ticket record
  - **Priority:** High
  - **TDD Phase:** Red: failing mapping test; Green: add assignee projection; Refactor: keep DTO mapping isolated

- **Test:** represent unassigned ticket without invalid assignee data
  - **Given:** a ticket with no owner
  - **When:** the ticket record is mapped to response output
  - **Then:** the assignee field is null, empty, or omitted according to API contract, and not populated with placeholder data
  - **Priority:** Medium
  - **TDD Phase:** Red: failing null-assignee representation test; Green: implement contract-compliant mapping; Refactor: simplify mapping branches

### Persistence Behavior
- **Test:** persist assignment change with correct ticket and assignee linkage
  - **Given:** a valid assignment request
  - **When:** the service completes successfully
  - **Then:** storage contains the updated assignee relationship for that ticket only
  - **Priority:** High
  - **TDD Phase:** Red: failing persistence interaction test; Green: implement minimal repository update; Refactor: reduce repository duplication

- **Test:** do not persist partial changes when assignment fails validation or authorization
  - **Given:** an invalid or forbidden assignment request
  - **When:** the service handles the request
  - **Then:** no ticket ownership changes are committed
  - **Priority:** High
  - **TDD Phase:** Red: failing non-persistence test; Green: guard before write; Refactor: keep transaction boundary clear

## Integration Test Specifications

### Assignment API Endpoint
- **Test:** assign ticket successfully through API
  - **Given:** an authenticated IT Support Agent, an existing ticket, and a valid assignee
  - **When:** the client submits the ticket assignment API request
  - **Then:** the API returns success and the persisted ticket record reflects the assignee
  - **Priority:** High

- **Test:** return validation error for malformed assignment payload
  - **Given:** an authenticated request with missing or invalid required fields
  - **When:** the client submits the ticket assignment API request
  - **Then:** the API returns a client error with validation details and no data change
  - **Priority:** High

- **Test:** return forbidden when non-agent attempts assignment
  - **Given:** an authenticated user lacking IT Support Agent permission
  - **When:** the client submits the ticket assignment API request
  - **Then:** the API returns forbidden and no assignment is stored
  - **Priority:** High

- **Test:** return not found when ticket does not exist
  - **Given:** an authenticated IT Support Agent and a non-existent ticket identifier
  - **When:** the client submits the ticket assignment API request
  - **Then:** the API returns not found and no assignment is stored
  - **Priority:** High

- **Test:** return not found or validation error when assignee does not exist
  - **Given:** an authenticated IT Support Agent, an existing ticket, and a non-existent assignee identifier
  - **When:** the client submits the ticket assignment API request
  - **Then:** the API returns the defined client error and the ticket remains unchanged
  - **Priority:** High

### Ticket Retrieval with Assignee
- **Test:** retrieve assigned ticket and include assignee data
  - **Given:** a ticket previously assigned through the API or service
  - **When:** the client requests the ticket record
  - **Then:** the response includes the assigned owner information
  - **Priority:** High

- **Test:** retrieve unassigned ticket and show no assignee
  - **Given:** an existing ticket with no assignment
  - **When:** the client requests the ticket record
  - **Then:** the response shows no assignee according to contract
  - **Priority:** Medium

### Persistence and Transaction Integrity
- **Test:** assignment request updates only the targeted ticket
  - **Given:** multiple tickets exist and one is assigned through the API
  - **When:** the assignment request completes
  - **Then:** only the specified ticket ownership changes
  - **Priority:** High

- **Test:** failed assignment does not commit ownership changes
  - **Given:** a request that fails during validation, authorization, or entity lookup
  - **When:** the assignment API is called
  - **Then:** the database state remains unchanged for the target ticket
  - **Priority:** High

## Acceptance Test Scenarios

### US 1: The system shall allow IT Support Agents to assign tickets
- **Scenario:** IT Support Agent assigns an unassigned ticket
  - **Given:** an existing unassigned ticket and an authenticated IT Support Agent
  - **When:** the agent assigns the ticket to a valid assignee
  - **Then:** the assignment succeeds and the ticket record displays the assignee

- **Scenario:** IT Support Agent reassigns a ticket
  - **Given:** an existing ticket already assigned to one agent
  - **When:** an authenticated IT Support Agent assigns it to another valid assignee
  - **Then:** the new assignee is shown on the ticket record

- **Scenario:** Unauthorized user cannot assign a ticket
  - **Given:** an existing ticket and an authenticated user who is not an IT Support Agent
  - **When:** the user attempts to assign the ticket
  - **Then:** the system rejects the request and the ticket assignment does not change

- **Scenario:** Assignment fails for unknown ticket
  - **Given:** an authenticated IT Support Agent and a non-existent ticket
  - **When:** the agent attempts to assign the ticket
  - **Then:** the system returns not found and no ownership change occurs

- **Scenario:** Assignment fails for unknown assignee
  - **Given:** an authenticated IT Support Agent and an existing ticket
  - **When:** the agent assigns the ticket to a non-existent assignee
  - **Then:** the system rejects the request and the ticket remains unchanged

## Test-First Development Guidelines
- 1. Write failing validation tests for missing/invalid ticket ID, assignee ID, and missing actor context.
- 2. Write failing authorization tests for IT Support Agent allowed vs non-agent forbidden.
- 3. Write failing service tests for ticket existence and assignee existence checks.
- 4. Write failing happy-path tests for assigning an unassigned ticket, then reassigning an assigned ticket.
- 5. Write failing idempotency test for assigning the same assignee.
- 6. Write failing mapping tests to ensure ticket retrieval exposes assignee correctly.
- 7. Write failing integration tests for API success, validation failure, forbidden, and not-found flows.
- 8. Write failing integration tests for retrieval of assigned/unassigned tickets.

- **Implementation sequence recommendations (Green phase)**
  - Implement minimum request validation.
  - Implement minimum authorization policy restricting assignment to IT Support Agents.
  - Implement ticket and assignee lookup checks.
  - Implement the smallest assignment update path and persistence call.
  - Implement ticket retrieval projection to include assignee.
  - Implement API error translation for validation, forbidden, and not-found outcomes.
  - Run the full test suite after each increment; do not proceed with additional behavior until all current tests are green.

- **Refactoring considerations (Refactor phase)**
  - Extract shared validation or authorization components only after the Rule of Three is met.
  - Keep business rules in the service/domain layer, not in transport handlers.
  - Separate repository concerns from response mapping.
  - Standardize result/error objects for validation, forbidden, and not-found outcomes.
  - Re-run all unit and integration tests after every refactor to preserve green state.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Assign a ticket with minimum/maximum valid identifier formats supported by the contract.
  - Verify behavior when the ticket is currently unassigned versus already assigned.
  - Verify same-assignee reassignment is handled as a no-op or stable success result per contract.

- Error handling tests
  - Missing required fields in assignment request.
  - Invalid identifier format for ticket or assignee.
  - Unauthenticated request.
  - Authenticated but unauthorized requester.
  - Ticket not found.
  - Assignee not found.
  - Persistence failure returns an error response and does not leave partial updates.

- Concurrency/timing tests (if applicable)
  - Two assignment requests for the same ticket submitted nearly simultaneously should result in a consistent final owner with no corrupted state.
  - Repeated identical assignment requests should not create duplicate side effects.
  - Retrieval immediately after successful assignment should reflect committed assignee data.