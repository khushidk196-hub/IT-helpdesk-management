# TDD Test Specifications: Ticket Status Tracking

## Overview
These tests validate backend behavior for tracking the current lifecycle status of a submitted ticket. The focus is on API retrieval, service/business rules, validation, persistence reads, and authorization/visibility constraints relevant to ticket status tracking.

TDD approach:
1. Write failing tests for status retrieval and visibility rules.
2. Implement the minimum code to return ticket status for valid requests.
3. Refactor only after tests are green, keeping behavior unchanged.
4. Repeat per acceptance criterion and boundary condition.

## Unit Test Specifications
### Ticket Status Retrieval
- **Test:** returns current status for an existing submitted ticket
  - **Given:** a ticket exists with a valid identifier and a current lifecycle status
  - **When:** the status retrieval service is invoked for that ticket
  - **Then:** the current status is returned with the ticket identifier
  - **Priority:** High
  - **TDD Phase:** Red: write failing service test for existing ticket lookup; Green: add minimal retrieval logic; Refactor: extract read model/mapper only if reused 3+ times

- **Test:** returns latest status when ticket has multiple lifecycle updates
  - **Given:** a ticket has a status history with multiple stage changes
  - **When:** the status retrieval service is invoked
  - **Then:** only the most recent/current lifecycle status is returned as the tracked status
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for latest-status selection; Green: implement current-status resolution; Refactor: centralize status ordering rules if repeated

- **Test:** rejects retrieval for non-existent ticket
  - **Given:** no ticket exists for the provided identifier
  - **When:** the status retrieval service is invoked
  - **Then:** a not-found result is returned and no status payload is produced
  - **Priority:** High
  - **TDD Phase:** Red: add failing not-found test; Green: implement repository miss handling; Refactor: align error mapping with shared domain patterns

### Ticket Lifecycle Validation
- **Test:** accepts only configured lifecycle statuses in tracked result
  - **Given:** the ticket status source contains a recognized lifecycle value
  - **When:** the service maps the status for response
  - **Then:** the response contains only an allowed lifecycle stage value
  - **Priority:** High
  - **TDD Phase:** Red: write failing test for allowed status mapping; Green: implement whitelist/enum validation; Refactor: extract shared status validator if reused broadly

- **Test:** fails safely when stored status value is invalid
  - **Given:** a ticket record exists with an unsupported or corrupted status value
  - **When:** the status retrieval service is invoked
  - **Then:** the service returns a controlled error and does not expose invalid internal data
  - **Priority:** Medium
  - **TDD Phase:** Red: add failing invalid-status test; Green: implement defensive validation; Refactor: consolidate domain validation behavior

### Access and Visibility Rules
- **Test:** allows ticket owner to retrieve status for their submitted ticket
  - **Given:** the requesting user is the owner of the ticket
  - **When:** the status retrieval service is invoked in that user context
  - **Then:** the current ticket status is returned
  - **Priority:** High
  - **TDD Phase:** Red: write failing authorization-success test; Green: implement ownership check; Refactor: extract authorization policy if reused

- **Test:** denies status retrieval for unauthorized user
  - **Given:** the requesting user is not permitted to view the ticket
  - **When:** the status retrieval service is invoked
  - **Then:** access is denied and ticket status details are not returned
  - **Priority:** High
  - **TDD Phase:** Red: add failing unauthorized-access test; Green: implement visibility guard; Refactor: standardize forbidden result handling

### Request Validation
- **Test:** rejects empty ticket identifier
  - **Given:** the request contains a missing or empty ticket identifier
  - **When:** status retrieval is requested
  - **Then:** a validation error is returned and no repository lookup occurs
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test; Green: implement input guard; Refactor: reuse common identifier validation only under Rule of Three

- **Test:** rejects malformed ticket identifier
  - **Given:** the request contains a ticket identifier in an invalid format
  - **When:** status retrieval is requested
  - **Then:** a validation error is returned
  - **Priority:** Medium
  - **TDD Phase:** Red: add malformed-id failing test; Green: implement format validation; Refactor: align with shared validation standards

## Integration Test Specifications
### Ticket Status API Endpoint
- **Test:** GET ticket status returns current status for valid authorized request
  - **Given:** a persisted ticket exists with a current status and the caller is authorized
  - **When:** the API receives a status tracking request for that ticket
  - **Then:** the response is successful and includes the ticket identifier and current lifecycle status
  - **Priority:** High

- **Test:** GET ticket status returns not found for unknown ticket
  - **Given:** no persisted ticket matches the requested identifier
  - **When:** the API receives the status tracking request
  - **Then:** the response indicates not found
  - **Priority:** High

- **Test:** GET ticket status returns validation error for invalid identifier
  - **Given:** the request contains an empty or malformed ticket identifier
  - **When:** the API receives the status tracking request
  - **Then:** the response indicates client validation failure
  - **Priority:** High

- **Test:** GET ticket status returns forbidden for unauthorized caller
  - **Given:** a persisted ticket exists but the caller lacks permission to view it
  - **When:** the API receives the status tracking request
  - **Then:** the response indicates forbidden and no ticket status is disclosed
  - **Priority:** High

### Service to Repository Integration
- **Test:** status retrieval reads current status from persisted ticket record
  - **Given:** the database contains a submitted ticket with a stored current lifecycle status
  - **When:** the status tracking service executes
  - **Then:** the returned result matches the persisted current status
  - **Priority:** High

- **Test:** latest persisted lifecycle update is reflected in status response
  - **Given:** the database contains a ticket with multiple persisted status changes
  - **When:** the status tracking flow is executed end-to-end
  - **Then:** the response reflects the latest persisted lifecycle stage
  - **Priority:** High

### Error and Contract Handling
- **Test:** invalid persisted status is translated to controlled server/domain error
  - **Given:** the data store contains a ticket with an unsupported status value
  - **When:** the API status tracking flow executes
  - **Then:** the system returns a controlled error response without leaking internal storage details
  - **Priority:** Medium

## Acceptance Test Scenarios
### US 1 - The system shall allow users to track ticket status after submission
- **Scenario:** user tracks status of submitted ticket successfully
  - **Given:** a user has submitted a ticket and is permitted to view it
  - **When:** the user requests the ticket status
  - **Then:** the system returns the current lifecycle stage of that ticket

- **Scenario:** user cannot track status of non-existent ticket
  - **Given:** a user requests status for a ticket identifier that does not exist
  - **When:** the tracking request is processed
  - **Then:** the system indicates that the ticket was not found

- **Scenario:** user cannot track status with invalid ticket identifier
  - **Given:** a user provides an empty or malformed ticket identifier
  - **When:** the tracking request is processed
  - **Then:** the system rejects the request with a validation error

- **Scenario:** user cannot view status of ticket they are not allowed to access
  - **Given:** a ticket exists but the requesting user is not authorized to view it
  - **When:** the user requests the ticket status
  - **Then:** the system denies access and does not reveal the ticket status

- **Scenario:** user sees the latest lifecycle stage after status updates
  - **Given:** a submitted ticket has progressed through multiple lifecycle stages
  - **When:** the user requests the ticket status
  - **Then:** the system returns the latest current status for that ticket

## Test-First Development Guidelines
- Ordered list of which tests to write first (Red phase)
  1. Unit test: returns current status for an existing submitted ticket
  2. Unit test: rejects retrieval for non-existent ticket
  3. Unit test: rejects empty ticket identifier
  4. Unit test: allows ticket owner to retrieve status for their submitted ticket
  5. Unit test: denies status retrieval for unauthorized user
  6. Unit test: returns latest status when ticket has multiple lifecycle updates
  7. Unit test: fails safely when stored status value is invalid
  8. Integration test: GET ticket status returns current status for valid authorized request
  9. Integration test: not found, validation failure, and forbidden endpoint behaviors
  10. Integration test: latest persisted lifecycle update is reflected in status response

- Implementation sequence recommendations (Green phase)
  1. Add minimal request validation for ticket identifier
  2. Add repository read for ticket by identifier
  3. Add current-status selection logic
  4. Add ownership/authorization check
  5. Add API response mapping for success, validation, not found, and forbidden outcomes
  6. Add defensive handling for invalid persisted status values
  7. Run full suite after each step; proceed only when green

- Refactoring considerations (Refactor phase)
  - Keep status retrieval use case isolated from transport concerns
  - Separate validation, authorization, domain mapping, and persistence concerns
  - Extract shared error/result objects only after repeated use
  - Preserve API contract while simplifying branching logic
  - Re-run all unit and integration tests after every refactor change

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Ticket identifier at minimum valid length/format is accepted
  - Ticket identifier at maximum valid length/format is accepted
  - Ticket with initial submitted state is trackable immediately after creation
  - Ticket with terminal lifecycle state still returns that terminal status as current

- Error handling tests
  - Missing ticket identifier returns validation failure
  - Malformed ticket identifier returns validation failure
  - Unknown ticket returns not found
  - Unauthorized access returns forbidden without existence/details leakage beyond policy
  - Unsupported persisted status returns controlled error
  - Null/empty persisted status is handled as invalid domain data

- Concurrency/timing tests (if applicable)
  - When a status update and status read occur close together, the read returns a consistent persisted current status
  - Repeated status tracking requests for the same unchanged ticket return stable results
  - If status history ordering relies on timestamps, identical or near-identical timestamps resolve deterministically according to defined persistence ordering rules