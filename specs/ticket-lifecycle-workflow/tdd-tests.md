# TDD Test Specifications: Ticket Lifecycle Workflow

## Overview
These tests validate backend support for the full ticket lifecycle: creation, assignment, investigation, resolution, and closure, as required by REQ-003. The TDD approach should implement each lifecycle capability incrementally using Red → Green → Refactor, with tests covering API behavior, domain/service rules, validation, persistence, and state transition integrity.

## Unit Test Specifications

### Ticket Creation
- **Test:** creates ticket in initial lifecycle state
  - **Given:** valid ticket creation data with required fields
  - **When:** the create-ticket service is invoked
  - **Then:** a new ticket is created with an initial status representing the start of the lifecycle, and persisted with generated identifier and audit timestamps
  - **Priority:** High
  - **TDD Phase:** Red: assert ticket is created in initial state only. Green: implement minimal creation logic and persistence mapping. Refactor: extract validation/value objects only if repeated patterns emerge.

- **Test:** rejects ticket creation when required fields are missing
  - **Given:** ticket creation data missing one or more mandatory fields
  - **When:** the create-ticket service is invoked
  - **Then:** validation fails with structured error details and no ticket is persisted
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test for minimum required input. Green: add minimal request/domain validation. Refactor: centralize shared validation rules if reused 3+ times.

- **Test:** rejects invalid field formats or values on ticket creation
  - **Given:** ticket creation data containing invalid values such as empty strings, unsupported enums, or over-limit lengths
  - **When:** the create-ticket service is invoked
  - **Then:** validation error is returned and invalid data is not stored
  - **Priority:** High
  - **TDD Phase:** Red: define highest-risk invalid inputs. Green: implement strict input validation. Refactor: consolidate constraints into domain validation policy.

### Ticket Assignment
- **Test:** assigns ticket from initial state to a valid assignee
  - **Given:** an existing ticket in a creatable/assignable state and a valid assignee identifier
  - **When:** the assign-ticket service is invoked
  - **Then:** the ticket status changes to assignment-related state, assignee details are stored, and assignment metadata is updated
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for first valid transition. Green: implement minimal assignment transition rule. Refactor: extract transition policy object if additional state rules accumulate.

- **Test:** rejects assignment for nonexistent ticket
  - **Given:** a ticket identifier that does not exist
  - **When:** the assign-ticket service is invoked
  - **Then:** a not-found result is returned and no state change occurs
  - **Priority:** High
  - **TDD Phase:** Red: assert lookup failure. Green: add repository existence check. Refactor: standardize not-found handling.

- **Test:** rejects assignment when assignee is invalid
  - **Given:** an existing ticket and an invalid or missing assignee identifier
  - **When:** the assign-ticket service is invoked
  - **Then:** validation or business-rule failure is returned and the ticket remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: define failing invalid-assignee test. Green: implement minimum assignee validation. Refactor: share actor validation across lifecycle actions.

- **Test:** rejects assignment from terminal lifecycle state
  - **Given:** an existing ticket already closed
  - **When:** the assign-ticket service is invoked
  - **Then:** the transition is rejected as invalid and no data is modified
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid transition. Green: add transition guard. Refactor: centralize lifecycle state matrix.

### Investigation Progression
- **Test:** moves assigned ticket into investigation state
  - **Given:** an assigned ticket
  - **When:** the investigation-start service is invoked
  - **Then:** the ticket status changes to investigation state and investigation-start metadata is recorded
  - **Priority:** High
  - **TDD Phase:** Red: write failing transition test. Green: implement minimal transition. Refactor: reuse transition execution path where appropriate.

- **Test:** rejects investigation start for unassigned ticket
  - **Given:** a ticket that has not been assigned
  - **When:** the investigation-start service is invoked
  - **Then:** the request fails due to invalid lifecycle order and the state remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: assert lifecycle ordering rule. Green: add prerequisite-state check. Refactor: move prerequisite validation into state policy.

### Resolution
- **Test:** resolves ticket after investigation with resolution details
  - **Given:** a ticket in investigation state and valid resolution information
  - **When:** the resolve-ticket service is invoked
  - **Then:** the status changes to resolved and resolution details plus resolution timestamp are stored
  - **Priority:** High
  - **TDD Phase:** Red: define required resolution fields and expected state change. Green: implement minimal resolution logic. Refactor: extract resolution payload validation if reused.

- **Test:** rejects resolution when required resolution details are absent
  - **Given:** a ticket in investigation state and incomplete resolution data
  - **When:** the resolve-ticket service is invoked
  - **Then:** validation fails and the ticket remains in investigation state
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for missing resolution notes/code. Green: add minimum validation. Refactor: unify action-specific validation structure.

- **Test:** rejects resolution from invalid prior state
  - **Given:** a ticket not in investigation state
  - **When:** the resolve-ticket service is invoked
  - **Then:** the transition is rejected and no resolution data is recorded
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid transition behavior. Green: add state guard. Refactor: consolidate transition guard logic.

### Closure
- **Test:** closes resolved ticket successfully
  - **Given:** a ticket in resolved state
  - **When:** the close-ticket service is invoked
  - **Then:** the status changes to closed and closure timestamp/actor are recorded
  - **Priority:** High
  - **TDD Phase:** Red: define successful terminal transition. Green: implement minimal close logic. Refactor: standardize terminal-state metadata handling.

- **Test:** rejects closure before resolution
  - **Given:** a ticket in created, assigned, or investigation state
  - **When:** the close-ticket service is invoked
  - **Then:** closure is rejected as an invalid lifecycle transition
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for premature closure. Green: add prerequisite resolved-state check. Refactor: move terminal transition rule into shared policy.

- **Test:** prevents further lifecycle modifications after closure
  - **Given:** a closed ticket
  - **When:** any mutating lifecycle action is invoked
  - **Then:** the action is rejected and the closed ticket remains immutable except for allowed audit reads
  - **Priority:** High
  - **TDD Phase:** Red: capture one representative closed-state mutation failure, then broaden as needed. Green: implement immutable terminal-state guard. Refactor: enforce through shared transition validator.

### Audit and Persistence Rules
- **Test:** records lifecycle timestamps and actor metadata for each successful transition
  - **Given:** a valid lifecycle action request
  - **When:** the corresponding service completes successfully
  - **Then:** state-specific audit fields are stored consistently with the transition
  - **Priority:** Medium
  - **TDD Phase:** Red: assert minimum audit fields for one transition first. Green: implement metadata persistence. Refactor: extract common audit updater.

- **Test:** does not persist partial updates when lifecycle action fails
  - **Given:** a lifecycle request that fails validation or business rules
  - **When:** the service processes the request
  - **Then:** no partial status, assignee, resolution, or audit changes are committed
  - **Priority:** High
  - **TDD Phase:** Red: assert unchanged persisted record after failure. Green: implement transactional update behavior. Refactor: standardize command handling boundaries.

## Integration Test Specifications

### Ticket Lifecycle API Endpoints
- **Test:** create ticket endpoint persists and returns created lifecycle resource
  - **Given:** a valid create-ticket API request
  - **When:** the API endpoint is called
  - **Then:** the response indicates successful creation and returns ticket identifier, initial status, and persisted data
  - **Priority:** High

- **Test:** assignment endpoint updates ticket state and assignee
  - **Given:** an existing created ticket and valid assignment request
  - **When:** the assignment API endpoint is called
  - **Then:** the response reflects updated assignment state and the database stores the assignee and new status
  - **Priority:** High

- **Test:** investigation endpoint enforces lifecycle ordering
  - **Given:** a ticket not yet assigned
  - **When:** the investigation-start API endpoint is called
  - **Then:** the API returns a business-rule error and the stored status remains unchanged
  - **Priority:** High

- **Test:** resolution endpoint stores resolution details and status
  - **Given:** a ticket in investigation state and valid resolution payload
  - **When:** the resolution API endpoint is called
  - **Then:** the response shows resolved status and the database stores resolution metadata
  - **Priority:** High

- **Test:** closure endpoint only succeeds for resolved tickets
  - **Given:** one resolved ticket and one non-resolved ticket
  - **When:** the closure API endpoint is called for each
  - **Then:** the resolved ticket closes successfully and the non-resolved ticket returns an invalid-transition error
  - **Priority:** High

### Persistence and Transaction Boundaries
- **Test:** failed lifecycle transition does not commit any database changes
  - **Given:** a persisted ticket and a request that violates lifecycle rules
  - **When:** the corresponding API/service path is executed
  - **Then:** the operation fails and the stored ticket record remains unchanged
  - **Priority:** High

- **Test:** lifecycle history or audit data remains consistent with final persisted state
  - **Given:** a ticket progressed through multiple valid lifecycle steps
  - **When:** the final state is retrieved
  - **Then:** persisted audit metadata aligns with the current state progression without missing or contradictory transition data
  - **Priority:** Medium

### Backend Integration Constraints
- **Test:** invalid identifiers and malformed payloads are rejected at API boundary
  - **Given:** malformed request bodies or invalid ticket identifiers
  - **When:** lifecycle endpoints are invoked
  - **Then:** the API returns validation errors in the standard error format and no downstream state mutation occurs
  - **Priority:** High

- **Test:** nonexistent ticket requests return not-found without internal error leakage
  - **Given:** a validly formed request targeting a nonexistent ticket
  - **When:** any lifecycle mutation endpoint is called
  - **Then:** the API returns not-found semantics with sanitized error content
  - **Priority:** High

## Acceptance Test Scenarios

### US 1 / REQ-003
- **Scenario:** complete ticket lifecycle succeeds in required order
  - **Given:** a valid new ticket request
  - **When:** the ticket is created, assigned, moved to investigation, resolved, and then closed through supported API operations
  - **Then:** each step succeeds in sequence and the final ticket status is closed with prior lifecycle data preserved

- **Scenario:** lifecycle step is rejected when attempted out of order
  - **Given:** an existing ticket that has not reached the prerequisite state for the requested action
  - **When:** a later lifecycle action such as investigation, resolution, or closure is requested
  - **Then:** the action is rejected with a business-rule error and the ticket remains in its prior valid state

- **Scenario:** invalid request data does not create or mutate ticket lifecycle state
  - **Given:** a lifecycle request with missing required fields or invalid values
  - **When:** the API processes the request
  - **Then:** validation errors are returned and no ticket data is created or updated

- **Scenario:** closed tickets remain terminal
  - **Given:** a ticket already closed through the valid workflow
  - **When:** another lifecycle mutation is attempted
  - **Then:** the system rejects the request and preserves the closed status unchanged

## Test-First Development Guidelines
1. Write tests in this order: create ticket success, create ticket validation failure, assign success, invalid assignment cases, investigation success, investigation ordering failure, resolve success, resolve validation failure, close success, premature close failure, closed-ticket immutability, transactional failure behavior.
2. Implement the minimum domain model and service logic needed to satisfy one test at a time; avoid building the full workflow upfront.
3. Expose API endpoints only after core service/state-transition tests pass for the corresponding action.
4. Add persistence integration tests once the basic domain transitions are green.
5. Refactor after each green step:
   - Extract lifecycle state transition rules into a dedicated policy when duplication appears.
   - Standardize validation/error contracts across endpoints.
   - Isolate repository and transaction boundaries behind interfaces appropriate for the monolith architecture.
   - Apply Rule of Three before introducing shared abstractions for commands, validators, or audit handling.
6. Run the full suite after every refactor; do not proceed to the next lifecycle stage until all prior tests remain green.

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Create ticket with minimum valid required fields only.
  - Create/resolve with maximum allowed text lengths.
  - Validate supported/unsupported status and action values.
  - Validate identifier format boundaries for ticket ID and assignee ID.

- Error handling tests
  - Missing required payload fields.
  - Empty or whitespace-only required strings.
  - Nonexistent ticket on any lifecycle mutation.
  - Invalid state transition attempts at every major stage.
  - Duplicate closure attempt on already closed ticket.
  - Standardized validation, not-found, and business-rule error responses without leaking internal details.

- Concurrency/timing tests (if applicable)
  - Two concurrent assignment attempts against the same ticket result in one consistent persisted outcome.
  - Concurrent close and resolve operations do not leave the ticket in an impossible intermediate state.
  - Repeated identical mutation requests do not corrupt lifecycle state or duplicate audit metadata.
  - Transition timestamps remain monotonic across successful ordered lifecycle steps.