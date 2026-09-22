# TDD Test Specifications: Ticket Commenting

## Overview
These tests validate backend support for ticket commenting in a monolith architecture: adding comments to tickets and retrieving comment history for tickets over time. The TDD approach should follow strict Red → Green → Refactor sequencing for each acceptance criterion, starting with failing tests for core business rules, then implementing the minimum API/service/data behavior, and finally refactoring while keeping all tests green.

## Unit Test Specifications
### Comment Creation Validation
- **Test:** reject comment creation when ticket identifier is missing or invalid
  - **Given:** a request/model with no ticket identifier or malformed identifier
  - **When:** comment creation is validated
  - **Then:** validation fails and no comment is persisted
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test; Green: add minimal identifier validation; Refactor: centralize shared ticket-id validation if reused 3+ times

- **Test:** reject comment creation when comment body is missing
  - **Given:** a valid ticket identifier and agent identity but empty/null comment text
  - **When:** comment creation is validated
  - **Then:** validation fails with a required-field error and no comment is persisted
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for empty body; Green: enforce required body rule; Refactor: extract reusable text-required rule only after repeated use

- **Test:** reject comment creation when comment body exceeds allowed length
  - **Given:** a valid ticket identifier and agent identity with comment text above repository-standard maximum length
  - **When:** comment creation is validated
  - **Then:** validation fails and no comment is persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing boundary test; Green: implement max-length rule per repo validation standards/config; Refactor: move limits to domain constants/config

- **Test:** accept comment creation when required fields are valid
  - **Given:** a valid ticket identifier, valid agent identity, and valid comment text
  - **When:** comment creation is validated
  - **Then:** validation succeeds
  - **Priority:** High
  - **TDD Phase:** Red: failing happy-path test; Green: implement minimum passing validation; Refactor: simplify validator structure

### Comment Business Rules
- **Test:** create a comment linked to the specified ticket
  - **Given:** an existing ticket and a valid agent-submitted comment
  - **When:** the comment service creates the comment
  - **Then:** the created comment references the target ticket and stores the submitted text
  - **Priority:** High
  - **TDD Phase:** Red: failing service test for linkage; Green: persist ticket-comment association; Refactor: isolate mapping/domain creation logic

- **Test:** record comment author as the authenticated IT Support Agent
  - **Given:** an existing ticket and an authenticated IT Support Agent
  - **When:** the comment service creates the comment
  - **Then:** the saved comment contains the agent identity as author/audit source
  - **Priority:** High
  - **TDD Phase:** Red: failing author attribution test; Green: populate author from caller context; Refactor: extract audit metadata builder if repeated

- **Test:** record comment creation timestamp
  - **Given:** an existing ticket and valid comment input
  - **When:** the comment service creates the comment
  - **Then:** the saved comment includes a creation timestamp from the system clock
  - **Priority:** Medium
  - **TDD Phase:** Red: failing timestamp test; Green: assign current timestamp; Refactor: inject time provider for deterministic tests

- **Test:** reject comment creation for a non-existent ticket
  - **Given:** a ticket identifier that does not match any stored ticket
  - **When:** the comment service creates the comment
  - **Then:** the operation fails with a not-found outcome and no comment is persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing not-found test; Green: add ticket existence check; Refactor: unify entity lookup error handling

- **Test:** reject comment creation from a non-agent actor
  - **Given:** a valid ticket and authenticated actor without IT Support Agent permission
  - **When:** the comment service creates the comment
  - **Then:** the operation is denied and no comment is persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing authorization unit test; Green: enforce role/business permission rule; Refactor: extract policy abstraction if reused

### Comment History Retrieval
- **Test:** return comment history for an existing ticket in chronological order
  - **Given:** a ticket with multiple stored comments over time
  - **When:** comment history is requested
  - **Then:** comments are returned ordered by creation time according to API contract
  - **Priority:** High
  - **TDD Phase:** Red: failing ordering test; Green: implement retrieval with explicit ordering; Refactor: encapsulate ordering rule in repository/query object

- **Test:** return empty history when ticket has no comments
  - **Given:** an existing ticket with no stored comments
  - **When:** comment history is requested
  - **Then:** an empty collection is returned
  - **Priority:** Medium
  - **TDD Phase:** Red: failing empty-history test; Green: return empty collection; Refactor: standardize empty-result semantics

- **Test:** reject history retrieval for a non-existent ticket
  - **Given:** a ticket identifier that does not exist
  - **When:** comment history is requested
  - **Then:** the operation returns a not-found outcome
  - **Priority:** High
  - **TDD Phase:** Red: failing not-found retrieval test; Green: add existence enforcement; Refactor: reuse common ticket lookup logic

### API Contract and Error Mapping
- **Test:** map valid add-comment request to success response
  - **Given:** a valid API request to add a comment
  - **When:** the request is handled by the ticket comment endpoint
  - **Then:** the response indicates success and includes comment identifier and persisted fields defined by contract
  - **Priority:** High
  - **TDD Phase:** Red: failing endpoint contract test; Green: implement minimal request/response mapping; Refactor: extract DTO mappers if repeated

- **Test:** map validation failures to client error response without persistence
  - **Given:** an invalid add-comment API request
  - **When:** the endpoint handles the request
  - **Then:** a validation/client error response is returned and no comment is created
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-request test; Green: wire validator to endpoint; Refactor: consolidate error response translation

- **Test:** map unauthorized or forbidden comment attempts to access error response
  - **Given:** an add-comment request from unauthenticated or non-agent caller
  - **When:** the endpoint handles the request
  - **Then:** the response is an authentication/authorization error and no comment is created
  - **Priority:** High
  - **TDD Phase:** Red: failing access-control test; Green: enforce access checks; Refactor: align with shared policy pipeline

## Integration Test Specifications
### Add Comment Endpoint to Service to Database
- **Test:** persist a new comment for an existing ticket through the API
  - **Given:** an existing ticket and authenticated IT Support Agent with valid request payload
  - **When:** the add-comment API is called
  - **Then:** a comment record is stored, linked to the ticket, attributed to the agent, and returned in the response
  - **Priority:** High

- **Test:** do not persist a comment when payload validation fails
  - **Given:** an existing ticket, authenticated IT Support Agent, and invalid comment payload
  - **When:** the add-comment API is called
  - **Then:** a client error is returned and the database contains no new comment
  - **Priority:** High

- **Test:** do not persist a comment when ticket does not exist
  - **Given:** an authenticated IT Support Agent and a valid payload targeting a non-existent ticket
  - **When:** the add-comment API is called
  - **Then:** a not-found response is returned and the database remains unchanged
  - **Priority:** High

- **Test:** deny comment creation for non-agent caller across API and service layers
  - **Given:** an authenticated caller lacking IT Support Agent rights
  - **When:** the add-comment API is called
  - **Then:** access is denied and no comment record is created
  - **Priority:** High

### Comment History Retrieval Across Components
- **Test:** retrieve persisted comment history for a ticket through the API
  - **Given:** a ticket with multiple persisted comments from one or more agents
  - **When:** the comment history API is called
  - **Then:** the response returns the stored comments in chronological order with expected audit fields
  - **Priority:** High

- **Test:** return empty history for ticket without comments through the API
  - **Given:** an existing ticket with no persisted comments
  - **When:** the comment history API is called
  - **Then:** a successful response with an empty collection is returned
  - **Priority:** Medium

- **Test:** return not-found for comment history of non-existent ticket
  - **Given:** a ticket identifier not present in storage
  - **When:** the comment history API is called
  - **Then:** a not-found response is returned
  - **Priority:** High

### Persistence and Transaction Behavior
- **Test:** ensure comment creation is atomic
  - **Given:** a valid add-comment request and a simulated persistence failure during save
  - **When:** the add-comment operation is executed
  - **Then:** no partial comment data is committed
  - **Priority:** Medium

## Acceptance Test Scenarios
### US 1 - The system shall allow IT Support Agents to add comments to tickets
- **Scenario:** IT Support Agent adds a comment to an existing ticket
  - **Given:** an existing ticket and an authenticated IT Support Agent
  - **When:** the agent submits a valid comment for the ticket
  - **Then:** the system stores the comment and associates it with that ticket

- **Scenario:** Comment is visible in ticket comment history over time
  - **Given:** a ticket with previously stored comments
  - **When:** comment history is requested for the ticket
  - **Then:** all stored comments for that ticket are returned in chronological order

- **Scenario:** Invalid comment submission is rejected
  - **Given:** an authenticated IT Support Agent and an invalid comment request
  - **When:** the agent attempts to add the comment
  - **Then:** the system rejects the request and does not store a comment

- **Scenario:** Non-agent user cannot add a ticket comment
  - **Given:** a valid ticket and an authenticated caller who is not an IT Support Agent
  - **When:** the caller attempts to add a comment
  - **Then:** the system denies the action and no comment is stored

- **Scenario:** Comment cannot be added to a non-existent ticket
  - **Given:** an authenticated IT Support Agent and a ticket identifier that does not exist
  - **When:** the agent attempts to add a comment
  - **Then:** the system returns not found and stores no comment

## Test-First Development Guidelines
- 1. Write failing unit tests for comment body required/max-length validation and ticket-id validation.
- 2. Write failing unit tests for ticket existence and IT Support Agent authorization rules.
- 3. Write failing unit tests for successful comment creation with ticket link, author attribution, and timestamp.
- 4. Write failing unit tests for comment history retrieval, including empty and ordered results.
- 5. Write failing API-level tests for add-comment success, validation failure, forbidden access, and ticket not found.
- 6. Write failing integration tests for persistence, retrieval, and atomic save behavior.

- **Implementation sequence recommendations (Green phase)**
  - Implement minimal request validation to satisfy required-field and boundary tests.
  - Implement authorization/policy check for IT Support Agent role only.
  - Implement minimal ticket lookup and not-found handling.
  - Implement comment creation service with persistence of ticket link, body, author, and timestamp.
  - Implement history retrieval query with explicit ordering.
  - Implement endpoint/error mapping only after service behavior is covered by tests.
  - Run the full test suite after each increment; do not proceed until all tests are green.

- **Refactoring considerations (Refactor phase)**
  - Extract shared validation and lookup logic only after repetition appears at least three times.
  - Introduce reusable policy/audit abstractions if add/view comment flows duplicate access and metadata rules.
  - Replace direct time access with a clock abstraction for deterministic tests.
  - Keep API DTO mapping separate from domain/service logic per Clean Architecture boundaries.
  - Re-run all unit, integration, and acceptance tests after every refactor step.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Comment body exactly at minimum allowed non-empty value should succeed.
  - Comment body exactly at maximum allowed length should succeed.
  - Comment body just above maximum allowed length should fail.
  - Ticket with zero comments should return an empty collection, not null.
  - Multiple comments with close timestamps should still return deterministic chronological order.

- Error handling tests
  - Missing authentication should return authentication error and no persistence.
  - Invalid ticket identifier format should return client error before persistence.
  - Unknown ticket should return not-found without leaking internal details.
  - Persistence failure during comment creation should surface a controlled server error and roll back changes.
  - Request should not allow author identity spoofing through payload if author is server-derived from authenticated context.

- Concurrency/timing tests (if applicable)
  - Concurrent valid comment submissions to the same ticket should persist both comments without data loss.
  - Concurrent history retrieval during comment creation should not return corrupted or partially saved records.
  - Ordering should remain stable when comments are created nearly simultaneously, using a documented secondary sort if needed.