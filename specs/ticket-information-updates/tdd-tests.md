# TDD Test Specifications: Ticket Information Updates

## Overview
These tests validate backend behavior for allowing IT Support Agents to update ticket information during ticket processing, ensuring saved values are persisted and available for later review.

TDD approach:
1. Write failing tests for authorization, validation, update behavior, persistence, and retrieval.
2. Implement the minimum API/service/data-layer logic to pass.
3. Refactor only after tests are green, preserving behavior and aligning with monolith architecture boundaries.

## Unit Test Specifications

### Authorization & Access Control
- **Test:** only IT Support Agents can update ticket information
  - **Given:** a valid ticket exists and the acting user is not an IT Support Agent
  - **When:** an update request is evaluated by the service
  - **Then:** the request is rejected as unauthorized/forbidden and no ticket changes are persisted
  - **Priority:** High
  - **TDD Phase:** Red: assert rejection for non-agent roles; Green: add minimal role check; Refactor: centralize authorization policy if reused 3+ times

- **Test:** IT Support Agent can update ticket information during processing
  - **Given:** a valid ticket exists and the acting user has IT Support Agent permissions
  - **When:** the service processes a valid ticket information update
  - **Then:** the update is accepted for eligible ticket processing state
  - **Priority:** High
  - **TDD Phase:** Red: assert current implementation rejects/misses update; Green: permit authorized role; Refactor: extract policy object only if repeated

### Ticket State Eligibility
- **Test:** ticket information can be updated while ticket is in processing state
  - **Given:** a ticket currently marked as in processing
  - **When:** valid ticket information changes are submitted
  - **Then:** the service applies and saves the updated values
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for processing-state success; Green: allow updates for processing state; Refactor: isolate state rule logic

- **Test:** ticket information update is rejected when ticket is not in an updatable state
  - **Given:** a ticket exists in a non-processing or closed/finalized state
  - **When:** an update is requested
  - **Then:** the service rejects the request and leaves stored ticket information unchanged
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid-state update fails; Green: add state guard; Refactor: consolidate state validation rules

### Data Validation
- **Test:** valid ticket information fields are accepted and mapped correctly
  - **Given:** an update payload with supported fields and valid values
  - **When:** the payload is validated
  - **Then:** validation succeeds and the domain update model contains the expected field values
  - **Priority:** High
  - **TDD Phase:** Red: define failing validation/mapping expectations; Green: implement minimal validator and mapper; Refactor: separate parsing from business validation

- **Test:** invalid field values are rejected with validation errors
  - **Given:** an update payload containing malformed, missing-required, overlength, or otherwise invalid values per domain rules
  - **When:** validation is performed
  - **Then:** the request is rejected with field-specific validation errors and no persistence occurs
  - **Priority:** High
  - **TDD Phase:** Red: write failing negative validation tests; Green: add minimal validation rules; Refactor: deduplicate common validation helpers

- **Test:** unsupported or immutable fields cannot be changed
  - **Given:** an update payload attempts to modify non-updatable fields such as system-managed identifiers/status metadata
  - **When:** the service evaluates the update
  - **Then:** those changes are rejected or ignored according to API contract, and protected data remains unchanged
  - **Priority:** High
  - **TDD Phase:** Red: assert protected fields cannot be altered; Green: whitelist allowed update fields; Refactor: move field policy to dedicated updater

### Update Service Behavior
- **Test:** service updates only the provided ticket information fields
  - **Given:** an existing ticket with populated data and a partial update payload
  - **When:** the update is applied
  - **Then:** specified fields are changed and unspecified fields retain prior values
  - **Priority:** High
  - **TDD Phase:** Red: assert partial update semantics; Green: implement selective field merge; Refactor: extract merge logic if reused

- **Test:** service returns updated ticket information after save
  - **Given:** a successful update operation
  - **When:** the service completes the save
  - **Then:** the returned result contains the latest persisted ticket information
  - **Priority:** Medium
  - **TDD Phase:** Red: assert response reflects persisted state; Green: return updated entity/DTO; Refactor: streamline response mapping

- **Test:** no database write occurs when submitted values produce no effective change
  - **Given:** a payload identical to currently stored updatable ticket information
  - **When:** the update is processed
  - **Then:** the service reports success or no-op per contract without unnecessary persistence side effects
  - **Priority:** Medium
  - **TDD Phase:** Red: assert no-op behavior; Green: add minimal change detection; Refactor: encapsulate equality comparison

### Persistence & Audit-Related Domain Rules
- **Test:** updated ticket information is persisted atomically
  - **Given:** multiple valid field changes in one update request
  - **When:** persistence is attempted
  - **Then:** either all changes are committed together or none are stored on failure
  - **Priority:** High
  - **TDD Phase:** Red: write failing transactional behavior test; Green: wrap update in transaction boundary; Refactor: align transaction scope with service boundary

- **Test:** update metadata is recorded for traceability if audit fields are part of Golden Repo standards
  - **Given:** a successful update by an IT Support Agent
  - **When:** the ticket is saved
  - **Then:** system-managed metadata such as last modified timestamp/user is updated and consistent
  - **Priority:** Medium
  - **TDD Phase:** Red: assert metadata changes on save; Green: populate audit fields; Refactor: move audit enrichment to shared persistence concern only if repeated

## Integration Test Specifications

### Ticket Update API Endpoint
- **Test:** authorized agent updates ticket information through API and receives updated representation
  - **Given:** an existing ticket in processing state and an authenticated IT Support Agent
  - **When:** the client submits a valid update request to the ticket update endpoint
  - **Then:** the API returns success and the response contains the updated ticket information
  - **Priority:** High

- **Test:** API rejects update request from unauthorized role
  - **Given:** an existing ticket and an authenticated user without IT Support Agent privileges
  - **When:** the client submits the same update request
  - **Then:** the API returns forbidden/unauthorized and the ticket remains unchanged
  - **Priority:** High

- **Test:** API returns validation errors for invalid update payload
  - **Given:** an authenticated IT Support Agent and an invalid request body
  - **When:** the update endpoint is called
  - **Then:** the API returns a validation error response with no persisted changes
  - **Priority:** High

- **Test:** API returns not found for unknown ticket identifier
  - **Given:** an authenticated IT Support Agent and a non-existent ticket id
  - **When:** the update endpoint is called
  - **Then:** the API returns not found and no write occurs
  - **Priority:** High

### API-to-Service-to-Database Flow
- **Test:** successful update persists data retrievable on subsequent review fetch
  - **Given:** a ticket in processing state is updated successfully
  - **When:** the ticket is fetched afterward through the read path used for review
  - **Then:** the latest saved values are returned
  - **Priority:** High

- **Test:** failed persistence does not leave ticket partially updated
  - **Given:** a valid update request and a simulated database failure during save
  - **When:** the service attempts to persist changes
  - **Then:** the API/service reports failure and the database retains the pre-update state
  - **Priority:** High

### Concurrency & Consistency
- **Test:** concurrent updates follow defined consistency rule
  - **Given:** two update requests target the same processing ticket near-simultaneously
  - **When:** both are submitted
  - **Then:** system behavior matches the chosen contract (e.g., optimistic conflict or last-write-wins) and result is consistent and testable
  - **Priority:** Medium

## Acceptance Test Scenarios

### US 1 - Update ticket information during processing
- **Scenario:** IT Support Agent successfully updates ticket information during processing
  - **Given:** a ticket is in processing and the requester is an IT Support Agent
  - **When:** the requester submits valid ticket information changes
  - **Then:** the system saves the updated ticket information

- **Scenario:** latest saved ticket information is shown on review
  - **Given:** a ticket has been successfully updated during processing
  - **When:** the ticket is later retrieved for review
  - **Then:** the retrieved ticket shows the latest saved values

- **Scenario:** invalid ticket information is not saved
  - **Given:** a ticket is in processing and the requester is an IT Support Agent
  - **When:** the requester submits invalid ticket information changes
  - **Then:** the system rejects the update and preserves the previous saved values

- **Scenario:** unauthorized user cannot update ticket information
  - **Given:** a ticket is in processing and the requester is not an IT Support Agent
  - **When:** the requester attempts to update ticket information
  - **Then:** the system denies the request and does not save changes

- **Scenario:** ticket outside processing cannot be updated through this feature
  - **Given:** a ticket is not in processing
  - **When:** an IT Support Agent submits ticket information changes
  - **Then:** the system rejects the update and retains existing values

## Test-First Development Guidelines
- **Ordered list of which tests to write first (Red phase)**
  1. Authorized IT Support Agent can update a processing ticket successfully
  2. Updated values are returned on subsequent review retrieval
  3. Non-agent cannot update ticket information
  4. Non-processing ticket cannot be updated
  5. Invalid payload is rejected with no persistence
  6. Unknown ticket id returns not found
  7. Partial update preserves unspecified fields
  8. Protected/non-updatable fields cannot be changed
  9. Transaction rollback occurs on persistence failure
  10. Concurrency behavior matches defined contract

- **Implementation sequence recommendations (Green phase)**
  1. Add minimal endpoint/service path for ticket update
  2. Add ticket lookup and not-found handling
  3. Add role authorization check
  4. Add processing-state eligibility rule
  5. Add payload validation for allowed fields
  6. Add selective field merge and persistence
  7. Add read-path verification that review returns persisted values
  8. Add audit metadata updates if required by repository standards
  9. Add transaction handling and failure rollback
  10. Add concurrency control consistent with persistence strategy

- **Refactoring considerations (Refactor phase)**
  - Keep controller/endpoint thin; move rules into application/service layer
  - Separate authorization, validation, and state eligibility concerns
  - Introduce reusable abstractions only after the Rule of Three
  - Preserve clear distinction between updatable and system-managed fields
  - Re-run full test suite after each extraction or transaction boundary adjustment

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Minimum/maximum allowed lengths or formats for any updatable ticket information fields defined in the domain
  - Empty-string versus null handling for optional and required fields
  - Partial update with exactly one field changed
  - Payload containing all supported updatable fields

- Error handling tests
  - Unknown ticket id returns not found
  - Invalid request body/schema returns validation error
  - Attempt to update immutable/system-managed fields is rejected or ignored per contract
  - Persistence exception returns failure without data corruption
  - Authorization failure does not leak sensitive ticket data in error response

- Concurrency/timing tests (if applicable)
  - Concurrent updates to same ticket produce deterministic outcome per chosen locking/versioning rule
  - Retry behavior, if supported, does not duplicate or corrupt updates
  - Last modified metadata reflects the committed update only