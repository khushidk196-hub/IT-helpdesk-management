# Feature: User Ticket Submission And Tracking
Status: NEW
Owner: Astra
Last Updated: 2026-09-22

## Summary
This feature enables employees and business users to create and track their own support tickets in a centralized platform. The business problem addressed is the need for a single place where requestors can submit support issues and monitor their progress. The expected outcome is that authorized end users can independently submit a support ticket and view the status of tickets they created.

## Scope
### In Scope
- Support ticket creation by employees.
- Support ticket creation by business users.
- Support ticket tracking by the same employees or business users who created the ticket.
- Use of a centralized platform for both ticket submission and tracking.

### Out of Scope
- Ticket assignment workflows.
- Agent, administrator, or support staff workflows.
- Ticket prioritization, categorization, routing, or escalation.
- Ticket updates by support teams.
- Notifications, alerts, or communications.
- Reporting or analytics.
- Integrations with external systems.
- Any behavior not explicitly supported by BRD-BRD-IThelpdeskrequirements-1.0.pdf §90 REQ-002.

## Application Type & Platform Context
Application type is unknown.

### Source Evidence
- Derived Source Signals: Application Type: unknown
- Application Type Evidence: Not specified in source.

### Open Question
- What application type and delivery channel are required for the centralized platform: web, mobile, desktop, API/service, or mixed?

## Actors and Permissions
### Actors
- Employee
- Business user

### Source-Supported Permissions
- Employees must be able to create their own support tickets in the centralized platform.
- Employees must be able to track their own support tickets in the centralized platform.
- Business users must be able to create their own support tickets in the centralized platform.
- Business users must be able to track their own support tickets in the centralized platform.

### Access Constraints
- Tracking is limited to the user's own support tickets, as stated by "create and track their own support tickets."

### Open Questions
- What authentication mechanism identifies an employee or business user?
- Are employee and business user distinct roles in the system, or simply different user categories with identical permissions?
- Are any other actors permitted to view or act on submitted tickets within this feature?

## Feature Development Intent
This is feature-development work to add or enable core end-user support-ticket functionality in the centralized platform. The system behavior to be delivered is:
- a user flow to create a support ticket, and
- a user flow to track tickets created by the same user.

The delivered outcome must satisfy the business requirement that employees and business users can self-serve their support submission and status tracking needs without leaving the centralized platform.

## UI Design & Interaction Contract
The source supports the existence of user capabilities for ticket creation and ticket tracking in a centralized platform, but does not define screens, layouts, fields, navigation, messages, or visual design.

### Source-Supported UI Behavior
- The platform must provide a way for employees and business users to create support tickets.
- The platform must provide a way for employees and business users to track their own support tickets.

### Open Questions
- What screens or pages are required for ticket creation and ticket tracking?
- What ticket information must be entered during submission?
- What ticket information must be shown during tracking?
- Is tracking limited to a list view, a detail view, or both?
- What validation messages, empty states, error states, or confirmation messages are required?
- Are there accessibility, localization, or content/tone requirements for the UI?

## API Contract
No API contract is specified in the source.

### Source-Supported Service Behavior
- The system must support creation of support tickets by employees and business users.
- The system must support retrieval of a user's own support tickets for tracking purposes.

### Open Questions
- Are there API endpoints required for ticket creation and tracking?
- What request and response data structures are required?
- What error conditions and error payloads are expected?
- Is ticket creation required to be idempotent?
- Is tracking required to support searching, filtering, sorting, or pagination?
- Are there integrations between the centralized platform and any downstream ticket-management services?

## Business Logic & Rules
- Employees may create support tickets.
- Business users may create support tickets.
- Employees may track their own support tickets.
- Business users may track their own support tickets.
- Tracking access is restricted to tickets owned by the requesting user.
- Ticket creation and ticket tracking must occur within the centralized platform.

### Open Questions
- What constitutes ownership of a ticket?
- What ticket lifecycle states, if any, must be trackable?
- Must users be able to track only open tickets, or all historical tickets they created?
- Are users permitted to edit, cancel, or reopen their own tickets?
- Is there any business rule for duplicate ticket submission?

## Data Model & Validation
The source establishes a support ticket as the core entity but does not define its fields.

### Source-Supported Entity
- Support ticket

### Minimum Source-Supported Data Expectations
- A support ticket must be attributable to the user who created it so the system can enforce "their own support tickets" tracking.
- A support ticket must be storable and retrievable within the centralized platform.

### Open Questions
- What fields are required to create a support ticket?
- What identifier is used to track a ticket?
- What fields are visible to the submitting user during tracking?
- What validation rules apply to ticket submission data?
- Are there retention, archival, or deletion requirements for tickets?
- Are attachments, comments, categories, or priority fields required?

## Functional Requirements
1. The system shall allow an authenticated employee to create a support ticket in the centralized platform.
2. The system shall allow an authenticated business user to create a support ticket in the centralized platform.
3. The system shall allow an authenticated employee to retrieve and track support tickets that the employee created.
4. The system shall allow an authenticated business user to retrieve and track support tickets that the business user created.
5. The system shall restrict ticket tracking results so that a user can access only support tickets owned by that user.
6. The system shall persist each created support ticket in the centralized platform so it can be tracked by its creator after submission.
7. The system shall associate each created support ticket with its creator at the time of creation.
8. The system shall provide ticket creation and ticket tracking capabilities as part of the same centralized platform experience.
9. The implementation shall define the required submission data contract for support ticket creation before development is completed. Open Question dependency.
10. The implementation shall define the ticket tracking data contract, including what ticket information is returned to the creator, before development is completed. Open Question dependency.
11. The implementation shall define the platform channel and access model for employees and business users before development is completed. Open Question dependency.

## Testability Notes
API/backend behaviors that should be covered by automated tests:
- Successful creation of a support ticket by an employee.
- Successful creation of a support ticket by a business user.
- Persistence of created tickets for later retrieval.
- Association of ticket ownership to the creating user.
- Retrieval of tickets owned by the requesting user.
- Rejection or exclusion of tickets not owned by the requesting user from tracking results.
- Contract validation once submission and tracking payloads are defined.

## Non-Functional Requirements
### Source-Supported
- The feature shall operate within a centralized platform.

### Open Questions
- Are there performance requirements for ticket creation or tracking?
- Are there reliability or availability requirements for the centralized platform?
- Are there security requirements beyond ownership-based access control?
- Are there auditability or logging requirements for ticket creation and tracking?
- Are there compliance, privacy, or data protection requirements?
- Are there accessibility requirements?
- Are there operational monitoring requirements?

## Acceptance Scenarios
### Scenario 1: Employee creates a support ticket
**Given** an authenticated employee has access to the centralized platform  
**When** the employee submits a support ticket  
**Then** the system creates the support ticket  
**And** associates the ticket to that employee  
**And** stores it in the centralized platform for later tracking

### Scenario 2: Business user creates a support ticket
**Given** an authenticated business user has access to the centralized platform  
**When** the business user submits a support ticket  
**Then** the system creates the support ticket  
**And** associates the ticket to that business user  
**And** stores it in the centralized platform for later tracking

### Scenario 3: Employee tracks own support tickets
**Given** an authenticated employee has previously created one or more support tickets  
**When** the employee requests to track support tickets in the centralized platform  
**Then** the system returns the employee's own support tickets  
**And** does not include tickets created by other users

### Scenario 4: Business user tracks own support tickets
**Given** an authenticated business user has previously created one or more support tickets  
**When** the business user requests to track support tickets in the centralized platform  
**Then** the system returns the business user's own support tickets  
**And** does not include tickets created by other users

### Scenario 5: User cannot track another user's tickets
**Given** a support ticket exists that was created by a different user  
**When** an authenticated employee or business user attempts to track tickets  
**Then** the system prevents access to tickets not owned by that user

## Traceability Matrix
| Source ID | Requirement | Acceptance Criteria | Test Coverage |
|---|---|---|---|
| US 1 / BRD §90 REQ-002 | The system shall allow an authenticated employee to create a support ticket in the centralized platform. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies employee ticket creation succeeds. |
| US 1 / BRD §90 REQ-002 | The system shall allow an authenticated business user to create a support ticket in the centralized platform. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies business user ticket creation succeeds. |
| US 1 / BRD §90 REQ-002 | The system shall allow an authenticated employee to retrieve and track support tickets that the employee created. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies employee can retrieve own tickets. |
| US 1 / BRD §90 REQ-002 | The system shall allow an authenticated business user to retrieve and track support tickets that the business user created. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies business user can retrieve own tickets. |
| US 1 / BRD §90 REQ-002 | The system shall restrict ticket tracking results so that a user can access only support tickets owned by that user. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies non-owner tickets are not accessible in tracking results. |
| US 1 / BRD §90 REQ-002 | The system shall persist each created support ticket in the centralized platform so it can be tracked by its creator after submission. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies created ticket is persisted and later retrievable. |
| US 1 / BRD §90 REQ-002 | The system shall associate each created support ticket with its creator at the time of creation. | Employees or business users must be able to create and track their own support tickets in the centralized platform. | Automated test verifies ownership association on creation. |
| Derived Source Signal | The implementation shall define the required submission data contract for support ticket creation before development is completed. | Not specified in source. | Contract tests cannot be finalized until required request fields are defined. |
| Derived Source Signal | The implementation shall define the ticket tracking data contract, including what ticket information is returned to the creator, before development is completed. | Not specified in source. | Retrieval contract tests cannot be finalized until response fields are defined. |
| Derived Source Signal | The implementation shall define the platform channel and access model for employees and business users before development is completed. | Not specified in source. | End-to-end access tests depend on confirmed platform and authentication model. |

## Open Questions
1. What application type and delivery channel are required for the centralized platform?
2. What authentication and identity mechanism determines whether a user is an employee or business user?
3. Are employee and business user separate roles with different behavior, or equivalent requestor types?
4. What input fields are required to create a support ticket?
5. What output fields must be available when users track their own tickets?
6. What ticket identifier or reference must be shown or used for tracking?
7. What ticket statuses or lifecycle states must be visible to the user during tracking?
8. Is tracking implemented as a ticket list, ticket detail, or both?
9. Are users allowed to view all historical tickets they created, or only active ones?
10. Are users allowed to edit, cancel, or otherwise manage submitted tickets?
11. What validation and error messages are required for invalid or failed ticket submission?
12. What validation and error behavior are required when tracking fails or no tickets exist?
13. Are there accessibility, localization, or content standards for the centralized platform?
14. Are any API contracts, endpoint definitions, or integration patterns required?
15. Are there non-functional requirements for performance, reliability, security, audit logging, or retention?
16. Are there any Golden Repo conventions applicable to monolith implementation that must be enforced for this feature but are not yet specified in the source package?

## Source References
- Feature ID: 44604859
- Feature Reference: 44604859
- Feature Title: User Ticket Submission And Tracking
- Feature Description: Allow employees and business users to create and track their own support tickets in a centralized platform.
- User Story: US 1
- User Story Acceptance Criteria: Employees or business users must be able to create and track their own support tickets in the centralized platform.
- Requirement Reference: BRD-BRD-IThelpdeskrequirements-1.0.pdf §90 REQ-002
- Source Document: BRD-BRD-IThelpdeskrequirements-1.0.pdf
- Source Reference: BRD-BRD-IThelpdeskrequirements-1.0.pdf § ASTRA
- Architecture Style: monolith
- Derived Source Signal: Application Type unknown
- Golden Repo convention references used: None provided in source context.