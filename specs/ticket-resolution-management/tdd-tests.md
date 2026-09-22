# TDD Test Specifications: Ticket Resolution Management

## Overview
These tests validate backend behavior for allowing IT Support Agents to resolve tickets and persist resolution as a distinct lifecycle stage. The TDD approach should follow the acceptance criterion directly: write failing tests for resolution authorization, lifecycle transition, validation, persistence, and API behavior; implement only enough code to pass; then refactor while keeping all tests green. UI concerns are intentionally excluded.

## Unit Test Specifications
### Ticket Resolution Authorization
- **Test:** only IT Support Agents can resolve a ticket
  - **Given:** a ticket eligible for resolution and a user without the IT Support Agent role
  - **When:** the resolve-ticket business operation is invoked
  - **Then:** the operation is rejected with an authorization error and no ticket changes are persisted
  - **Priority:** High
  - **TDD Phase:** Red: write failing authorization test first; Green: add minimum role check in service layer; Refactor: extract authorization policy only if reused 3+ times

- **Test:** IT Support Agent is permitted to resolve a ticket
  - **Given:** a ticket eligible for resolution and a user with the IT Support Agent role
  - **When:** the resolve-ticket business operation is invoked
  - **Then:** authorization succeeds and processing continues to lifecycle validation
  - **Priority:** High
  - **TDD Phase:** Red: write failing positive authorization test; Green: implement minimal allow rule; Refactor: centralize actor validation if pattern repeats

### Ticket Lifecycle Transition
- **Test:** resolving a ticket changes status to Resolved lifecycle stage
  - **Given:** an existing unresolved ticket in a resolvable state
  - **When:** an IT Support Agent resolves the ticket
  - **Then:** the ticket status becomes Resolved as a distinct lifecycle stage
  - **Priority:** High
  - **TDD Phase:** Red: write failing state-transition test mapped to REQ-002; Green: implement status update only; Refactor: introduce lifecycle transition rules object if transitions grow

- **Test:** resolve operation rejects non-resolvable current states
  - **Given:** a ticket already resolved, closed, or otherwise marked non-resolvable by lifecycle rules
  - **When:** the resolve-ticket business operation is invoked
  - **Then:** the operation fails with a domain validation error and status remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: write failing invalid-transition test; Green: add minimal guard clause; Refactor: move transition matrix into domain policy if reused

- **Test:** resolving one ticket does not alter unrelated tickets
  - **Given:** multiple tickets exist and one is selected for resolution
  - **When:** the selected ticket is resolved
  - **Then:** only the targeted ticket is updated
  - **Priority:** Medium
  - **TDD Phase:** Red: write failing isolation test; Green: scope update by ticket identifier; Refactor: tidy repository update semantics

### Input and Domain Validation
- **Test:** resolve operation requires a valid ticket identifier
  - **Given:** a missing, malformed, or unsupported ticket identifier
  - **When:** the resolve-ticket business operation is invoked
  - **Then:** validation fails and no repository call to update status is made
  - **Priority:** High
  - **TDD Phase:** Red: write failing input validation test; Green: implement minimal identifier validation; Refactor: consolidate shared request validation

- **Test:** resolve operation fails when ticket does not exist
  - **Given:** a well-formed ticket identifier that is not found
  - **When:** the resolve-ticket business operation is invoked
  - **Then:** a not-found error is returned and no create/update side effects occur
  - **Priority:** High
  - **TDD Phase:** Red: write failing not-found test; Green: add repository existence check; Refactor: normalize domain error mapping

- **Test:** status value persisted for resolution matches approved lifecycle enumeration
  - **Given:** a successful resolve operation
  - **When:** the ticket entity is updated
  - **Then:** the stored status uses the canonical Resolved value rather than a free-form string
  - **Priority:** Medium
  - **TDD Phase:** Red: write failing enum/canonical-value test; Green: implement constrained status assignment; Refactor: centralize lifecycle constants

### Audit and Metadata Rules
- **Test:** successful resolution records resolver identity and resolution timestamp if required by domain standards
  - **Given:** an eligible ticket and authenticated IT Support Agent
  - **When:** the ticket is resolved
  - **Then:** the update includes traceable resolver metadata and a resolution timestamp
  - **Priority:** Medium
  - **TDD Phase:** Red: write failing metadata test if Golden Repo/domain standards require auditability; Green: add minimum metadata fields; Refactor: extract audit enricher if repeated

- **Test:** failed resolution attempt does not write partial resolution metadata
  - **Given:** a resolve request that fails authorization or lifecycle validation
  - **When:** processing ends in error
  - **Then:** status, resolver identity, and resolution timestamp remain unchanged
  - **Priority:** High
  - **TDD Phase:** Red: write failing no-partial-write test; Green: ensure updates happen only after all guards pass; Refactor: wrap state mutation in single domain method

## Integration Test Specifications
### Resolve Ticket API Endpoint
- **Test:** API resolves ticket successfully for authorized IT Support Agent
  - **Given:** an existing ticket in a resolvable state and an authenticated IT Support Agent request
  - **When:** the client calls the resolve-ticket endpoint for that ticket
  - **Then:** the API returns success, and the persisted ticket status is Resolved
  - **Priority:** High

- **Test:** API rejects resolve request from unauthorized actor
  - **Given:** an existing resolvable ticket and an authenticated user lacking IT Support Agent permissions
  - **When:** the client calls the resolve-ticket endpoint
  - **Then:** the API returns an authorization failure and the database record remains unchanged
  - **Priority:** High

- **Test:** API returns not found for unknown ticket identifier
  - **Given:** an authenticated IT Support Agent and a non-existent ticket identifier
  - **When:** the client calls the resolve-ticket endpoint
  - **Then:** the API returns a not-found response and no database changes occur
  - **Priority:** High

- **Test:** API rejects invalid ticket identifier per repository validation standards
  - **Given:** an authenticated IT Support Agent and an invalid ticket identifier in path or payload
  - **When:** the client calls the resolve-ticket endpoint
  - **Then:** the API returns a validation error with no service-side update attempt
  - **Priority:** High

### Service and Repository Interaction
- **Test:** successful resolution persists a single status transition atomically
  - **Given:** a resolvable ticket and a valid authorized request
  - **When:** the service performs the resolve operation
  - **Then:** the repository commits one atomic update containing the Resolved status and required metadata
  - **Priority:** High

- **Test:** invalid lifecycle transition prevents repository update
  - **Given:** a ticket in a non-resolvable state
  - **When:** the service is asked to resolve it
  - **Then:** the service returns a domain error and no persistence update is executed
  - **Priority:** High

- **Test:** concurrent resolve attempts do not produce inconsistent lifecycle state
  - **Given:** two near-simultaneous resolve requests for the same unresolved ticket
  - **When:** both requests are processed
  - **Then:** the final persisted state is valid, duplicate/contradictory updates are prevented, and the API responses are deterministic per concurrency policy
  - **Priority:** Medium

### Error Mapping and Contract Consistency
- **Test:** domain authorization, validation, and not-found errors are mapped to stable API error responses
  - **Given:** representative failures from service layer rules
  - **When:** the API endpoint handles each failure
  - **Then:** each is translated to the correct response category without leaking internal implementation details
  - **Priority:** Medium

## Acceptance Test Scenarios
### US 1 - The system shall allow IT Support Agents to resolve tickets
- **Scenario:** IT Support Agent resolves an eligible ticket
  - **Given:** an existing ticket that is not yet resolved and an authenticated IT Support Agent
  - **When:** the agent submits a resolve request
  - **Then:** the system marks the ticket as Resolved as a distinct lifecycle stage

- **Scenario:** Non-agent cannot resolve a ticket
  - **Given:** an existing ticket that is eligible for resolution and an authenticated user without IT Support Agent permission
  - **When:** the user submits a resolve request
  - **Then:** the system rejects the request and leaves the ticket unchanged

- **Scenario:** Ticket cannot be resolved when not found
  - **Given:** an authenticated IT Support Agent and a ticket identifier that does not exist
  - **When:** the agent submits a resolve request
  - **Then:** the system returns not found and performs no update

- **Scenario:** Ticket cannot be resolved from an invalid lifecycle state
  - **Given:** an authenticated IT Support Agent and a ticket already in a terminal or non-resolvable state
  - **When:** the agent submits a resolve request
  - **Then:** the system rejects the transition and preserves the original state

## Test-First Development Guidelines
- Ordered list of which tests to write first (Red phase)
  1. Failing unit test: IT Support Agent can resolve eligible ticket and status becomes Resolved
  2. Failing unit test: non-agent cannot resolve ticket
  3. Failing unit test: invalid lifecycle state cannot transition to Resolved
  4. Failing unit test: unknown ticket returns not found
  5. Failing unit test: invalid ticket identifier is rejected
  6. Failing integration test: resolve-ticket API success path
  7. Failing integration test: authorization failure mapping
  8. Failing integration test: not-found and validation error mapping
  9. Failing integration test: atomic persistence / no partial update
  10. Failing integration test: concurrent resolve behavior

- Implementation sequence recommendations (Green phase)
  1. Add minimal domain/service method for resolve-ticket
  2. Add ticket lookup and not-found handling
  3. Add minimal role/permission check for IT Support Agent
  4. Add lifecycle transition guard permitting only resolvable states
  5. Persist canonical Resolved status
  6. Add audit metadata if required by standards
  7. Expose API endpoint and map service outcomes to response contracts
  8. Add transactional/concurrency protection only as needed to satisfy tests

- Refactoring considerations (Refactor phase)
  - Keep transition logic in domain/service boundary, not controllers
  - Extract authorization and lifecycle policies only after repeated use (Rule of Three)
  - Replace duplicated validation/error handling with shared abstractions once tests are green
  - Preserve canonical status enum/value definitions in one place
  - Re-run full suite after each refactor to ensure no regression in authorization, transition rules, or persistence behavior

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Ticket identifier at minimum/maximum valid format boundaries
  - Resolution of tickets in each allowed pre-resolved state
  - Re-resolving an already resolved ticket should be rejected or idempotently handled per domain rule, but behavior must be explicitly specified and tested

- Error handling tests
  - Missing authentication context results in authentication failure
  - Unauthorized role results in authorization failure
  - Unknown ticket results in not found
  - Malformed request or invalid identifier results in validation failure
  - Repository/infrastructure failure during update returns controlled server error and does not leave partial state

- Concurrency/timing tests (if applicable)
  - Simultaneous resolve requests for the same ticket produce a single valid final state
  - Resolve request racing with another lifecycle update follows optimistic/pessimistic concurrency policy and prevents lost updates
  - Resolution timestamp, if stored, is set once from a reliable server-side source rather than client input