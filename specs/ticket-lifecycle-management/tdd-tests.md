# TDD Test Specifications: Ticket Lifecycle Management

## Overview
These tests validate backend support for the ticket lifecycle defined in REQ-001: creation, assignment, investigation, resolution, and closure, with traceable progression across stages.

TDD approach:
1. Write failing tests for each lifecycle stage and rule.
2. Implement only the minimum API/service/data logic needed to pass.
3. Refactor once tests are green, preserving traceability, validation, and workflow integrity.

Assumed backend scope for this feature:
- Ticket domain/service logic
- Lifecycle transition rules
- API endpoints for lifecycle actions
- Persistence of current status and status history/audit trail
- Validation of required data for transitions

Golden Repo-aligned constraints applied:
- Validate input at API boundaries
- Enforce domain rules in service layer
- Persist state changes atomically
- Return clear failure outcomes for invalid transitions or missing required data
- Keep lifecycle changes traceable via history/audit records

## Unit Test Specifications

### Lifecycle State Model
- **Test:** creates ticket with initial lifecycle state
  - **Given:** valid ticket creation data
  - **When:** a ticket is created
  - **Then:** the ticket is persisted with initial status `Created` and no later-stage fields populated
  - **Priority:** High
  - **TDD Phase:** Red: assert created status exists by default; Green: add minimal initialization logic; Refactor: centralize default state creation if reused

- **Test:** allows only defined lifecycle states
  - **Given:** a ticket entity or status update request with an undefined status value
  - **When:** validation/domain rules are applied
  - **Then:** the request is rejected with a validation/domain error
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test; Green: add enum/allowlist enforcement; Refactor: extract shared status validation only if reused 3+ times

### Lifecycle Transition Rules
- **Test:** permits valid sequential transition from Created to Assigned
  - **Given:** an existing ticket in `Created` status and valid assignment data
  - **When:** assignment is requested
  - **Then:** status changes to `Assigned`
  - **Priority:** High
  - **TDD Phase:** Red: assert transition succeeds; Green: add minimal transition rule; Refactor: move transition matrix into domain policy if pattern grows

- **Test:** permits valid sequential transition from Assigned to Investigation
  - **Given:** a ticket in `Assigned` status
  - **When:** investigation is started
  - **Then:** status changes to `Investigation`
  - **Priority:** High
  - **TDD Phase:** Red → Green → Refactor as above

- **Test:** permits valid sequential transition from Investigation to Resolution
  - **Given:** a ticket in `Investigation` status and required resolution details
  - **When:** resolution is recorded
  - **Then:** status changes to `Resolved`
  - **Priority:** High
  - **TDD Phase:** Red → Green → Refactor as above

- **Test:** permits valid sequential transition from Resolved to Closed
  - **Given:** a ticket in `Resolved` status
  - **When:** closure is requested
  - **Then:** status changes to `Closed`
  - **Priority:** High
  - **TDD Phase:** Red → Green → Refactor as above

- **Test:** rejects skipping lifecycle stages
  - **Given:** a ticket in `Created` or `Assigned` status
  - **When:** a later-stage transition such as resolve or close is requested directly
  - **Then:** the request is rejected as an invalid lifecycle transition
  - **Priority:** High
  - **TDD Phase:** Red: write failing tests for representative skip cases; Green: enforce transition rules; Refactor: consolidate invalid-transition handling

- **Test:** rejects transitions after closure
  - **Given:** a ticket in `Closed` status
  - **When:** any further lifecycle change is requested
  - **Then:** the request is rejected and no state is modified
  - **Priority:** High
  - **TDD Phase:** Red: assert immutability after closure; Green: block post-closure transitions; Refactor: encapsulate terminal-state behavior

### Assignment Rules
- **Test:** assignment requires assignee identifier
  - **Given:** a ticket in `Created` status and an assignment request missing assignee data
  - **When:** assignment is validated
  - **Then:** the request fails validation and status remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: failing validation test; Green: require assignee field; Refactor: reuse boundary validation structure

- **Test:** successful assignment stores assignee and assignment timestamp
  - **Given:** a valid assignment request
  - **When:** assignment succeeds
  - **Then:** assignee details and assignment timestamp are persisted with status `Assigned`
  - **Priority:** High
  - **TDD Phase:** Red: assert persisted assignment metadata; Green: store required fields; Refactor: standardize lifecycle metadata mapping

### Investigation Rules
- **Test:** investigation can start only for assigned ticket
  - **Given:** a ticket not in `Assigned` status
  - **When:** investigation start is requested
  - **Then:** the request is rejected as an invalid transition
  - **Priority:** High
  - **TDD Phase:** Red: failing invalid-state test; Green: add precondition check; Refactor: merge with transition policy

- **Test:** successful investigation stores investigation start metadata
  - **Given:** a ticket in `Assigned` status
  - **When:** investigation is started
  - **Then:** status becomes `Investigation` and investigation start metadata is recorded
  - **Priority:** Medium
  - **TDD Phase:** Red → Green → Refactor

### Resolution Rules
- **Test:** resolution requires resolution details
  - **Given:** a ticket in `Investigation` status and a resolution request missing required details
  - **When:** resolution is validated
  - **Then:** the request is rejected and the ticket remains in `Investigation`
  - **Priority:** High
  - **TDD Phase:** Red: failing validation test; Green: require resolution content; Refactor: align required-field validation patterns

- **Test:** successful resolution stores resolution metadata
  - **Given:** a valid resolution request for a ticket in `Investigation`
  - **When:** resolution is recorded
  - **Then:** status becomes `Resolved` and resolution details/timestamp are persisted
  - **Priority:** High
  - **TDD Phase:** Red → Green → Refactor

### Closure Rules
- **Test:** closure allowed only for resolved ticket
  - **Given:** a ticket not in `Resolved` status
  - **When:** closure is requested
  - **Then:** the request is rejected as an invalid transition
  - **Priority:** High
  - **TDD Phase:** Red: failing precondition test; Green: enforce resolved-only closure; Refactor: unify closure rule with transition policy

- **Test:** successful closure stores closure metadata
  - **Given:** a ticket in `Resolved` status
  - **When:** closure succeeds
  - **Then:** status becomes `Closed` and closure timestamp is persisted
  - **Priority:** Medium
  - **TDD Phase:** Red → Green → Refactor

### Traceability and Audit
- **Test:** each lifecycle transition creates a history record
  - **Given:** an existing ticket with one or more lifecycle changes
  - **When:** each valid transition occurs
  - **Then:** a history record is stored with ticket id, from-status, to-status, timestamp, and actor/context if available
  - **Priority:** High
  - **TDD Phase:** Red: assert history grows per transition; Green: persist one record per state change; Refactor: extract audit writer after repeated usage

- **Test:** invalid transition does not create history record
  - **Given:** an invalid lifecycle action
  - **When:** the request is processed
  - **Then:** no status change and no new history record are persisted
  - **Priority:** High
  - **TDD Phase:** Red: failing negative test; Green: make writes conditional on valid transition; Refactor: keep transaction boundaries clear

### API Request Validation
- **Test:** rejects malformed or incomplete lifecycle action payloads
  - **Given:** an API request with missing required fields or invalid field formats
  - **When:** the request reaches the API boundary
  - **Then:** the API returns a validation error and does not invoke state-changing domain behavior
  - **Priority:** High
  - **TDD Phase:** Red: boundary validation tests first; Green: add request validation; Refactor: standardize error responses

- **Test:** rejects lifecycle action for non-existent ticket
  - **Given:** a lifecycle action request for an unknown ticket identifier
  - **When:** the service attempts to load the ticket
  - **Then:** a not-found result is returned and no write occurs
  - **Priority:** High
  - **TDD Phase:** Red: failing not-found test; Green: add lookup guard; Refactor: share not-found handling conventions

## Integration Test Specifications

### Ticket Creation API to Persistence
- **Test:** create ticket endpoint persists initial lifecycle state
  - **Given:** a valid create-ticket API request
  - **When:** the request is processed through API, service, and repository layers
  - **Then:** a ticket record is stored with status `Created` and an initial traceable record if required by design
  - **Priority:** High

### Assignment Workflow Integration
- **Test:** assignment endpoint updates ticket and persists assignment metadata
  - **Given:** an existing created ticket and valid assignment request
  - **When:** the assignment API is called
  - **Then:** the response reflects `Assigned`, the ticket store is updated, and history contains the transition
  - **Priority:** High

### Investigation Workflow Integration
- **Test:** investigation endpoint updates ticket and history atomically
  - **Given:** an assigned ticket
  - **When:** the investigation start API is called
  - **Then:** status becomes `Investigation` and corresponding history is persisted in the same successful operation
  - **Priority:** High

### Resolution Workflow Integration
- **Test:** resolution endpoint stores resolution details and status change atomically
  - **Given:** a ticket in `Investigation` and a valid resolution payload
  - **When:** the resolution API is called
  - **Then:** the ticket is updated to `Resolved`, resolution metadata is stored, and history is recorded
  - **Priority:** High

### Closure Workflow Integration
- **Test:** closure endpoint finalizes ticket and prevents subsequent modifications
  - **Given:** a ticket in `Resolved`
  - **When:** the closure API is called and then another lifecycle action is attempted
  - **Then:** the ticket becomes `Closed`, closure history is persisted, and later lifecycle mutation is rejected
  - **Priority:** High

### Invalid Transition Handling
- **Test:** invalid lifecycle action returns error and no partial persistence
  - **Given:** a request that skips required stages
  - **When:** the lifecycle API is called
  - **Then:** an error response is returned, ticket state is unchanged, and no history/audit record is added
  - **Priority:** High

### Not Found and Validation Handling
- **Test:** lifecycle endpoint returns not found for unknown ticket id
  - **Given:** a valid lifecycle request with a non-existent ticket id
  - **When:** the API is called
  - **Then:** a not-found response is returned and no persistence side effects occur
  - **Priority:** High

- **Test:** lifecycle endpoint returns validation error for missing required transition fields
  - **Given:** a request missing assignee or resolution details where required
  - **When:** the API is called
  - **Then:** a validation error response is returned and the ticket remains unchanged
  - **Priority:** High

### Concurrency and Consistency
- **Test:** concurrent lifecycle updates do not produce inconsistent final state
  - **Given:** two competing valid-looking lifecycle requests against the same ticket
  - **When:** they are processed concurrently
  - **Then:** only one consistent transition path is persisted and conflicting update handling is returned for the loser
  - **Priority:** Medium

## Acceptance Test Scenarios

### US 1 - Ticket lifecycle from creation to closure
- **Scenario:** create a ticket and initialize lifecycle
  - **Given:** valid ticket creation data
  - **When:** the client creates a ticket
  - **Then:** the system stores the ticket in `Created` status

- **Scenario:** assign a created ticket
  - **Given:** a ticket in `Created` status and valid assignee data
  - **When:** the client requests assignment
  - **Then:** the system moves the ticket to `Assigned` and records assignment details

- **Scenario:** move assigned ticket into investigation
  - **Given:** a ticket in `Assigned` status
  - **When:** the client starts investigation
  - **Then:** the system moves the ticket to `Investigation` and records the transition

- **Scenario:** resolve a ticket under investigation
  - **Given:** a ticket in `Investigation` status and valid resolution details
  - **When:** the client records a resolution
  - **Then:** the system moves the ticket to `Resolved` and stores resolution details

- **Scenario:** close a resolved ticket
  - **Given:** a ticket in `Resolved` status
  - **When:** the client closes the ticket
  - **Then:** the system moves the ticket to `Closed` and records closure details

- **Scenario:** reject out-of-order lifecycle progression
  - **Given:** a ticket that has not reached the required prior stage
  - **When:** the client requests a later lifecycle stage directly
  - **Then:** the system rejects the request and preserves the current status

- **Scenario:** maintain traceable progression through all lifecycle stages
  - **Given:** a ticket that has progressed through multiple lifecycle stages
  - **When:** lifecycle history is queried or inspected
  - **Then:** each valid transition is traceable in chronological order

## Test-First Development Guidelines
1. **Write first (Red phase):**
   1. Create ticket initializes `Created`
   2. Created → Assigned valid transition
   3. Assigned → Investigation valid transition
   4. Investigation → Resolved requires resolution details
   5. Resolved → Closed valid transition
   6. Reject skip transitions
   7. Reject post-closure changes
   8. Create history record per valid transition
   9. Reject invalid payloads and unknown ticket ids
   10. Integration tests for atomic persistence across API/service/repository

2. **Implementation sequence (Green phase):**
   1. Add minimal ticket status model and default creation state
   2. Add transition guard logic for allowed next states
   3. Implement assignment behavior and required assignee validation
   4. Implement investigation start behavior
   5. Implement resolution behavior with required details
   6. Implement closure behavior
   7. Add history/audit persistence for successful transitions
   8. Add API boundary validation and not-found handling
   9. Add transaction/consistency handling for integrated writes
   10. Run full suite after each increment; proceed only when green

3. **Refactoring considerations (Refactor phase):**
   - Extract lifecycle transition policy once transition checks repeat
   - Consolidate shared validation/error patterns across lifecycle actions
   - Isolate audit/history writing behind a domain service if repeated 3+ times
   - Keep controller/API layer thin; enforce business rules in service/domain layer
   - Preserve atomic updates between ticket state and history persistence
   - Re-run full test suite after each refactor step

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Create ticket with minimum valid required input still initializes `Created`
  - Resolution details at minimum allowed length/shape are accepted
  - Invalid/empty identifiers for ticket or assignee are rejected
  - Re-submitting the same closure request should not create duplicate closure transitions if idempotency is expected; otherwise should fail consistently

- Error handling tests
  - Unknown ticket id returns not-found and no write
  - Missing assignee on assignment returns validation error
  - Missing resolution details on resolution returns validation error
  - Invalid status value or unsupported action returns validation/domain error
  - Persistence failure while writing history or status update results in no partial state change

- Concurrency/timing tests (if applicable)
  - Simultaneous assignment attempts result in one consistent persisted outcome
  - Concurrent resolve and close requests cannot bypass required sequence
  - Transition timestamps are recorded consistently and ordered for the same ticket