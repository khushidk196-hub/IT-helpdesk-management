# TDD Test Specifications: Ticket Ownership Assignment

## Overview
These tests validate backend behavior for maintaining visible ticket ownership through assignment, ensuring each ticket has a clearly identifiable responsible party for investigation and resolution accountability.

TDD approach:
1. Write failing tests for assignment rules, retrieval visibility, and validation.
2. Implement the minimum API/service/data logic to make each test pass.
3. Refactor only after tests are green, preserving traceability to REQ-003 and the acceptance criterion.

Assumed backend scope based on source context:
- Ticket domain supports an owner/assignee field
- Backend exposes assignment and retrieval behavior through API/service layers
- Persistence stores current ownership
- Validation follows Golden Repo expectations: explicit input validation, deterministic errors, no silent failure, and traceable business rules

## Unit Test Specifications
### Ownership Assignment Rules
- **Test:** assigns an owner to an unassigned ticket
  - **Given:** an existing ticket with no current owner and a valid assignable user identifier
  - **When:** the assignment service processes the ownership assignment request
  - **Then:** the ticket owner is set to that user and responsibility is marked as visible in the returned ticket state
  - **Priority:** High
  - **TDD Phase:** Red: assert owner is persisted in ticket state. Green: add minimal assignment logic. Refactor: extract ownership policy only if reused 3+ times.

- **Test:** reassigns ownership from one user to another
  - **Given:** an existing ticket already assigned to user A and a valid assignable user B
  - **When:** the assignment service processes a reassignment request
  - **Then:** ownership changes to user B and the previous owner is no longer the current visible owner
  - **Priority:** High
  - **TDD Phase:** Red: fail on unchanged owner. Green: update current owner only. Refactor: isolate state transition validation if repeated.

- **Test:** returns current owner as part of ticket retrieval
  - **Given:** an existing ticket assigned to a valid user
  - **When:** ticket details are retrieved through service logic
  - **Then:** the response includes the current owner needed to make accountability visible
  - **Priority:** High
  - **TDD Phase:** Red: verify owner field absent or incorrect. Green: expose persisted owner in DTO/model. Refactor: align mapping code with shared conventions.

- **Test:** preserves a single current owner per ticket
  - **Given:** an existing ticket and a valid assignment request
  - **When:** ownership is assigned or reassigned
  - **Then:** the resulting ticket state contains exactly one current owner reference
  - **Priority:** High
  - **TDD Phase:** Red: fail if multiple active owners can exist. Green: enforce single-owner invariant. Refactor: centralize invariant enforcement in domain/service layer.

### Validation and Business Constraints
- **Test:** rejects assignment when ticket identifier does not exist
  - **Given:** a non-existent ticket identifier and a valid user identifier
  - **When:** an assignment request is submitted
  - **Then:** the service returns a not-found business error and no ownership change is persisted
  - **Priority:** High
  - **TDD Phase:** Red: fail on silent success. Green: add ticket existence check. Refactor: reuse not-found handling abstraction only if repeated.

- **Test:** rejects assignment when assignee identifier is missing
  - **Given:** an existing ticket and an assignment request without an assignee identifier
  - **When:** validation is executed
  - **Then:** the request is rejected with a validation error describing the required field
  - **Priority:** High
  - **TDD Phase:** Red: expect validation failure. Green: add required-field validation. Refactor: merge with common request validation patterns.

- **Test:** rejects assignment when assignee does not exist
  - **Given:** an existing ticket and a non-existent assignee identifier
  - **When:** the assignment service validates the request
  - **Then:** the request fails with a deterministic validation or business error and the ticket owner remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: fail if invalid user is accepted. Green: check assignee existence. Refactor: extract user lookup policy if broadly reused.

- **Test:** rejects malformed assignment input
  - **Given:** an existing ticket and an assignment payload with invalid field format or unsupported values
  - **When:** request validation is performed
  - **Then:** the request fails with explicit field-level validation errors
  - **Priority:** Medium
  - **TDD Phase:** Red: assert malformed input passes incorrectly. Green: enforce schema/contract validation. Refactor: consolidate validators per Rule of Three.

- **Test:** does not alter ownership when validation fails
  - **Given:** a ticket with an existing owner and an invalid reassignment request
  - **When:** the assignment operation is attempted
  - **Then:** no partial update is saved and the original owner remains visible
  - **Priority:** High
  - **TDD Phase:** Red: detect partial persistence. Green: make assignment atomic. Refactor: align transaction boundary with service conventions.

### Accountability and Visibility
- **Test:** exposes owner information in list or summary ticket projections
  - **Given:** tickets with assigned owners
  - **When:** ticket summaries are retrieved for operational visibility
  - **Then:** each returned ticket includes current ownership information sufficient to identify responsibility
  - **Priority:** Medium
  - **TDD Phase:** Red: verify owner omitted from summary projection. Green: include owner in summary contract. Refactor: reuse projection mapping where patterns recur.

- **Test:** leaves ticket clearly unassigned when no owner exists
  - **Given:** an existing ticket with no owner
  - **When:** the ticket is retrieved
  - **Then:** the response clearly indicates unassigned ownership without implying a responsible user
  - **Priority:** Medium
  - **TDD Phase:** Red: fail if null/empty state is ambiguous. Green: expose explicit unassigned state. Refactor: standardize representation across endpoints.

## Integration Test Specifications
### Assignment API to Service to Persistence
- **Test:** assignment endpoint persists owner change and returns updated ticket ownership
  - **Given:** an existing ticket, a valid assignee, and an authenticated request with assignment permission as required by system policy
  - **When:** the API receives an ownership assignment request
  - **Then:** the service updates persistence and the API response reflects the new current owner
  - **Priority:** High

- **Test:** reassignment endpoint updates persisted ownership without creating duplicate active ownership records
  - **Given:** a ticket already owned by user A and a valid reassignment to user B
  - **When:** the API processes the reassignment request
  - **Then:** persistence contains only one active current owner and retrieval shows user B
  - **Priority:** High

### Validation and Error Mapping
- **Test:** assignment endpoint returns validation error for missing assignee
  - **Given:** an existing ticket and a request payload missing assignee data
  - **When:** the API validates the request
  - **Then:** it returns the standard validation error response and does not call persistence update logic
  - **Priority:** High

- **Test:** assignment endpoint returns not-found error for unknown ticket
  - **Given:** a non-existent ticket identifier and a valid assignee
  - **When:** the API processes the request
  - **Then:** it returns a not-found response consistent with repository error standards
  - **Priority:** High

- **Test:** assignment endpoint returns business error for unknown assignee
  - **Given:** an existing ticket and an unknown assignee identifier
  - **When:** the API processes the request
  - **Then:** it returns a deterministic error response and does not modify the ticket
  - **Priority:** High

### Read Model Visibility
- **Test:** ticket detail endpoint shows current owner after assignment
  - **Given:** a ticket has been successfully assigned
  - **When:** the ticket detail endpoint is queried
  - **Then:** the response includes the current owner for accountability visibility
  - **Priority:** High

- **Test:** ticket list endpoint shows ownership state for operational visibility
  - **Given:** a dataset containing assigned and unassigned tickets
  - **When:** the ticket list endpoint is queried
  - **Then:** each ticket includes either current owner information or a clear unassigned state
  - **Priority:** Medium

### Transactional Integrity
- **Test:** failed persistence during assignment does not leave ticket in partially updated state
  - **Given:** an existing ticket and a simulated persistence failure during assignment
  - **When:** the assignment request is processed
  - **Then:** the operation fails and subsequent retrieval shows the pre-existing ownership unchanged
  - **Priority:** High

## Acceptance Test Scenarios
### US 1 - Clear ownership through assignment
- **Scenario:** assign ownership to make responsibility visible
  - **Given:** an existing ticket without a current owner and a valid assignable user
  - **When:** ownership is assigned to that user
  - **Then:** the ticket shows that user as the current owner responsible for investigation and resolution

- **Scenario:** reassign ownership while keeping a single visible responsible party
  - **Given:** a ticket currently assigned to one user
  - **When:** ownership is reassigned to another valid user
  - **Then:** the ticket displays only the new current owner as responsible

- **Scenario:** retrieve ticket with visible ownership information
  - **Given:** a ticket has a current owner
  - **When:** the ticket is retrieved through the API
  - **Then:** the current owner is included so responsibility is visible

- **Scenario:** reject invalid assignment that would break accountability
  - **Given:** an existing ticket and an invalid assignment request
  - **When:** the request is submitted
  - **Then:** the API rejects the request and the ticket ownership remains unchanged

- **Scenario:** indicate when a ticket is currently unassigned
  - **Given:** an existing ticket with no owner
  - **When:** the ticket is retrieved
  - **Then:** the ownership state is clearly shown as unassigned

## Test-First Development Guidelines
1. Write tests first in this order:
   1. Assigns an owner to an unassigned ticket
   2. Returns current owner as part of ticket retrieval
   3. Preserves a single current owner per ticket
   4. Reassigns ownership from one user to another
   5. Rejects assignment when ticket identifier does not exist
   6. Rejects assignment when assignee identifier is missing
   7. Rejects assignment when assignee does not exist
   8. Does not alter ownership when validation fails
   9. Assignment endpoint persists owner change and returns updated ticket ownership
   10. Ticket list/detail endpoints show ownership visibility

2. Implementation sequence recommendations:
   1. Add minimal domain/persistence support for one current owner on a ticket
   2. Implement service-level assignment for valid ticket + valid assignee
   3. Expose owner in ticket detail response
   4. Add reassignment behavior
   5. Add request validation and deterministic error mapping
   6. Expose ownership in summary/list projections
   7. Add transaction protection for failed updates

3. Refactoring considerations:
   - Keep assignment rules in a single domain/service boundary
   - Avoid premature abstraction for validators and mappers
   - Extract shared ownership policy only after repeated usage
   - Preserve atomic update semantics around assignment persistence
   - Re-run all unit and integration tests after each refactor step

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Assign to a ticket with no existing owner
  - Reassign a ticket with an existing owner
  - Retrieve assigned and unassigned tickets from both detail and list views
  - Validate minimum acceptable identifier presence and format per API contract

- Error handling tests
  - Unknown ticket identifier
  - Missing assignee identifier
  - Unknown assignee identifier
  - Malformed payload or unsupported field values
  - Persistence failure during assignment
  - Negative test: request must not succeed silently when assignment cannot be completed

- Concurrency/timing tests (if applicable)
  - Concurrent reassignment requests for the same ticket should not result in multiple current owners
  - Retrieval immediately after successful assignment should return the committed current owner
  - Failed concurrent or stale update attempts should not overwrite a more recent committed owner if optimistic/pessimistic locking is part of repo standards