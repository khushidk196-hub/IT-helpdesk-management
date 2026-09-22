# Feature: Ticket Lifecycle State Visibility
Status: NEW
Owner: Astra
Last Updated: 2026-09-22

## Summary
This feature enables a user who accesses a ticket record to view that ticket’s current lifecycle state. The business outcome is improved visibility into ticket progress directly from the ticket record, without requiring users to infer or retrieve status through other means.

The source identifies this as a workflow-related feature for tickets and specifies that lifecycle state visibility must be available from the ticket record.

## Scope
### In Scope
- Displaying the current lifecycle state for a ticket when a user accesses that ticket record.
- Making the lifecycle state visible as part of the ticket record experience.

### Out of Scope
- Changing or updating the lifecycle state.
- Defining the full lifecycle model or allowed state values.
- Ticket creation, assignment, routing, escalation, or closure behavior.
- Notifications, reporting, analytics, or audit behavior related to lifecycle state.
- API changes, if any, beyond what is explicitly supported by the source.

## Application Type & Platform Context
Application type is **unknown**.

### Source Evidence
- Derived Source Signals: “Application Type: unknown”
- Derived Source Signals: “Application Type Evidence: Not specified in source.”

### Open Platform Question
- What application platform(s) are in scope for this feature: web, mobile, desktop, API/service, or a combination?

## Actors and Permissions
### Actor
- **User who accesses a ticket record**

### Source-Supported Permission Constraint
- A user must be able to access a ticket record in order to view its current lifecycle state.

### Permissions Notes
The source supports visibility for a user who accesses a ticket record, but it does not define:
- authentication requirements,
- authorization rules for ticket access,
- role-based access distinctions,
- whether all ticket viewers see the lifecycle state identically.

These items remain open.

## Feature Development Intent
This is feature-development work to ensure ticket records expose the ticket’s current lifecycle state to users who access those records. The required outcome is that lifecycle state is visible from the ticket record itself, satisfying the stated workflow requirement in the BRD and user story acceptance criteria.

## UI Design & Interaction Contract
### Source-Supported UI Contract
- The ticket record must present the ticket’s current lifecycle state to a user who accesses the record.

### Source-Supported Interaction Behavior
- When a user accesses a ticket record, the user can view the ticket’s current lifecycle state.

### Unknown / Not Specified in Source
The source does not specify:
- screen layout or placement of lifecycle state within the ticket record,
- label text, field title, or terminology beyond “current lifecycle state,”
- whether the state is read-only text, badge, chip, or another control,
- formatting, color usage, icons, or visual emphasis,
- empty, loading, or error states,
- accessibility requirements specific to this UI element,
- navigation paths to the ticket record.

These are open questions unless governed elsewhere.

## API Contract
No API contract is explicitly supported by the source.

The source does not specify:
- whether lifecycle state is returned by an existing ticket retrieval API,
- any endpoint, method, request, response schema, or error model,
- whether this is server-rendered only within a monolith,
- any integration contract between UI and backend.

Any API or service behavior needed to support this feature must be clarified before implementation.

## Business Logic & Rules
- A ticket has a current lifecycle state.
- The current lifecycle state must be viewable from the ticket record.
- Visibility of lifecycle state is conditional on the user accessing the ticket record.

### Business Rules Not Defined in Source
The source does not define:
- the set of possible lifecycle states,
- how the current lifecycle state is determined,
- whether lifecycle state can ever be null, unknown, or hidden,
- whether state visibility varies by user role,
- whether historical states or transitions are visible.

## Data Model & Validation
### Source-Supported Data Expectations
- **Entity:** Ticket
- **Attribute/Concept:** Current lifecycle state

### Validation Notes
The source establishes that the ticket record must expose the ticket’s current lifecycle state, but it does not define:
- the field name in storage or API,
- allowed values or reference data,
- whether the field is required for all tickets,
- default values,
- validation rules for missing or invalid state values.

These remain open questions.

## Functional Requirements
FR-1. The system shall allow a user who accesses a ticket record to view the ticket’s current lifecycle state.

FR-2. The ticket record shall expose the current lifecycle state as part of the ticket record information available to the accessing user.

FR-3. The system shall present the current lifecycle state for the specific ticket record being accessed.

FR-4. If the system cannot determine or retrieve a ticket’s current lifecycle state, the expected user-visible behavior must be defined before implementation. Until defined, implementation is blocked for this exception path.

FR-5. Any backend or service layer supporting ticket record retrieval for this feature shall provide the ticket’s current lifecycle state in a manner that enables automated verification of state visibility behavior. This requirement is contingent on the platform architecture decision and implementation approach.

## Testability Notes
- Verify that ticket retrieval behavior includes access to the current lifecycle state for the requested ticket record.
- Verify that the lifecycle state shown corresponds to the specific ticket being accessed, not another ticket.
- Verify behavior for missing, null, or unavailable lifecycle state once exception handling is defined.
- Verify any authorization-dependent access behavior once permissions are defined.
- Verify any API/service contract for ticket record retrieval once that contract is defined.

## Non-Functional Requirements
### Source-Supported Non-Functional Requirements
- None explicitly stated in the source.

### Constraints / Context
- User-selected Architecture Style: **monolith**

### Open Non-Functional Questions
The source does not specify:
- performance expectations for loading the lifecycle state,
- availability or reliability targets,
- security requirements beyond implied ticket access,
- accessibility standards,
- logging, observability, or audit expectations,
- localization requirements.

## Acceptance Scenarios
### Scenario 1: View current lifecycle state from a ticket record
**Given** a ticket exists with a current lifecycle state  
**And** a user accesses that ticket record  
**When** the ticket record is displayed  
**Then** the user can view the ticket’s current lifecycle state

### Scenario 2: View lifecycle state for the specific accessed ticket
**Given** multiple tickets exist with different current lifecycle states  
**And** a user accesses one ticket record  
**When** the ticket record is displayed  
**Then** the lifecycle state shown is the current lifecycle state of that specific ticket

### Scenario 3: Lifecycle state retrieval exception path
**Given** a user accesses a ticket record  
**And** the system cannot determine the ticket’s current lifecycle state  
**When** the ticket record is displayed  
**Then** behavior must follow a defined exception-handling rule  
**And** no implementation is complete for this scenario until that rule is specified

## Traceability Matrix
| Source ID | Requirement | Acceptance Criteria | Test Coverage |
|---|---|---|---|
| Feature 44604873 | FR-1: The system shall allow a user who accesses a ticket record to view the ticket’s current lifecycle state. | User accessing a ticket record can view its current lifecycle state. | Automated verification that a ticket record includes visible current lifecycle state for an accessed ticket. |
| Feature 44604873 | FR-2: The ticket record shall expose the current lifecycle state as part of the ticket record information available to the accessing user. | Lifecycle state is visible from the ticket record. | Automated verification that lifecycle state is present in ticket record data/representation. |
| Feature 44604873 | FR-3: The system shall present the current lifecycle state for the specific ticket record being accessed. | The viewed state corresponds to the accessed ticket. | Automated verification using multiple tickets with distinct lifecycle states. |
| US 1 | FR-1: The system shall allow a user who accesses a ticket record to view the ticket’s current lifecycle state. | “The platform shall allow a user who accesses a ticket record to view its current lifecycle state.” | Test retrieval/display behavior for accessed ticket record. |
| US 1 AC | FR-1: The system shall allow a user who accesses a ticket record to view the ticket’s current lifecycle state. | “The platform shall allow a user who accesses a ticket record to view its current lifecycle state.” | Positive-path automated test for ticket state visibility. |
| BRD-BRD-IThelpdeskrequirements-1.0.pdf §55 REQ-001 | FR-1, FR-2, FR-3 | Ticket record must allow viewing current lifecycle state. | Contract-level tests for state presence and correct ticket-state mapping. |

## Open Questions
1. What application platform(s) are in scope for this feature?
2. Where within the ticket record should the lifecycle state be shown?
3. What exact label or terminology should be presented to users for the lifecycle state field?
4. Is the lifecycle state strictly read-only in this context?
5. What are the allowed lifecycle state values?
6. Is every ticket required to have a current lifecycle state?
7. What user-visible behavior is required if the lifecycle state is missing, null, unavailable, or invalid?
8. Are there any roles or permissions that restrict visibility of lifecycle state even when a user can access the ticket record?
9. Does an existing ticket retrieval contract already include lifecycle state, or is backend/service work required?
10. If backend/service work is required, what is the authoritative contract for providing lifecycle state to the ticket record?
11. Are there any accessibility, localization, or formatting requirements for displaying lifecycle state?
12. Are there audit or logging requirements associated with viewing ticket lifecycle state?

## Source References
- Feature ID: 44604873
- Feature Reference: 44604873
- Feature Title: Ticket Lifecycle State Visibility
- Feature Description: “Enable users to view the current lifecycle state of a ticket from its record.”
- User Story: US 1
- User Story Acceptance Criteria: “The platform shall allow a user who accesses a ticket record to view its current lifecycle state.”
- Requirement Reference: BRD-BRD-IThelpdeskrequirements-1.0.pdf §55 REQ-001
- Source Document: BRD-BRD-IThelpdeskrequirements-1.0.pdf
- Source Reference: BRD-BRD-IThelpdeskrequirements-1.0.pdf § stakeholders
- Architecture Context: User-selected Architecture Style: monolith
- Derived Source Signals: Application Type unknown; Design Guidelines not specified in source