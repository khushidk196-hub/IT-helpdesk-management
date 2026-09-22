# Feature: Ticket Commenting
Status: NEW
Owner: Astra
Last Updated: 2026-09-22

## Summary
Ticket Commenting enables IT Support Agents to add comments to tickets and view comment history over time. The feature addresses the need to capture ongoing ticket-related communication and preserve a historical record of comments associated with each ticket. The expected outcome is that authorized IT Support Agents can record comments on tickets and access the accumulated comment history for those tickets.

## Scope
In scope:
- Allowing IT Support Agents to add comments to tickets.
- Allowing comment history on tickets to be viewed over time.
- Associating comments with tickets.

Out of scope:
- Comment editing.
- Comment deletion.
- End-user or non-agent commenting.
- Attachments, mentions, formatting, or reactions on comments.
- Notifications triggered by comments.
- Any ticket lifecycle changes caused by comments.
- API, UI, and integration details not stated in the source.

## Application Type & Platform Context
Application type: Unknown.

Source evidence:
- Derived Source Signals states: "Application Type: unknown"
- Application Type Evidence: "Not specified in source."

Architecture context:
- User-selected Architecture Style: monolith

Open Question:
- What application platform(s) will expose ticket commenting functionality: web, mobile, desktop, API-only, or mixed?

## Actors and Permissions
Actor:
- IT Support Agent

Explicitly supported permissions:
- IT Support Agents can add comments to tickets.
- IT Support Agents can view comment history on tickets over time.

Access constraints supported by source:
- Commenting capability is explicitly described for IT Support Agents.

Open Questions:
- Are any other roles permitted to view ticket comment history?
- Are any other roles permitted to add comments to tickets?
- How is an IT Support Agent identified and authorized within the system?

## Feature Development Intent
This is feature-development work to add or enable ticket comment capture and historical comment viewing for tickets. The behavior to be built is the ability for an IT Support Agent to submit a comment against a ticket and for the system to retain and present comment history for that ticket over time. The delivered outcome must satisfy the stated business requirement that IT Support Agents can add comments to tickets and support the feature description that comment history is viewable over time.

## UI Design & Interaction Contract
Source-supported UI behavior:
- A ticket context must support adding a comment by an IT Support Agent.
- A ticket context must support viewing comment history over time.

Source-supported interaction expectations:
- Comment entry must be available in relation to a ticket.
- Previously added comments must be retrievable and viewable as ticket comment history.

Not specified in source:
- Screen names, page layouts, component types, navigation flow, sorting order, timestamps display, author display, empty states, loading states, error messages, success messages, input length limits, rich text behavior, accessibility requirements, or visual design guidelines.

Open Questions:
- In what ticket interface or screen should comment entry and comment history appear?
- What fields and controls are required for adding a comment?
- How should comment history be ordered when displayed?
- Should comment author and timestamp be shown in the UI?
- What validation or feedback messages should be shown when comment submission fails or succeeds?
- Are there accessibility or design system requirements applicable to comment entry and history display?

## API Contract
Source-supported API contract:
- None explicitly specified.

Source-supported service behavior:
- The system must support adding comments to tickets.
- The system must support viewing comment history on tickets over time.

Not specified in source:
- Endpoints, methods, request/response schemas, authentication model, authorization mechanism, error codes, pagination, filtering, idempotency, concurrency handling, or integration behavior.

Open Questions:
- Is ticket commenting exposed through internal APIs, external APIs, or only server-rendered application logic?
- What operations are required to create a comment and retrieve comment history?
- What request and response fields are required?
- What error conditions and response behaviors are required for invalid ticket references, unauthorized users, or invalid comment content?
- Is pagination or limiting required for long comment histories?

## Business Logic & Rules
Source-supported business rules:
- The system shall allow IT Support Agents to add comments to tickets.
- Tickets shall have comment history viewable over time.
- Comments are associated with tickets.
- Comment history is historical in nature and therefore must persist over time after comments are added.

Source-supported policy constraints:
- The explicitly named actor for adding comments is the IT Support Agent.

Not specified in source:
- Whether comments are immutable after creation.
- Whether comments are visible immediately after creation.
- Whether empty comments are allowed.
- Whether comments must record author and creation time.
- Whether comment history has ordering, retention, archival, or visibility rules.
- Whether comments affect ticket status, assignment, SLA, or audit behavior.

Open Questions:
- Must each submitted comment be permanently retained as part of ticket history?
- Are comments editable or immutable after creation?
- Are empty or whitespace-only comments prohibited?
- Is comment history expected to display in chronological or reverse-chronological order?
- Are timestamps and comment authors mandatory parts of comment history?

## Data Model & Validation
Source-supported entities:
- Ticket
- Comment
- Comment history

Source-supported relationships:
- A comment is associated with a ticket.
- A ticket can have comment history over time, implying multiple comments per ticket.

Validation supported by source:
- None explicitly specified beyond the ability to add comments to tickets.

Not specified in source:
- Comment field definitions.
- Ticket identifier format.
- Comment length constraints.
- Required metadata such as author, created date, updated date, or visibility flags.
- Retention period or archival rules.
- Data quality constraints for comment text.

Open Questions:
- What fields constitute a comment record?
- Is comment text the only required content field?
- What ticket identifier is used to associate comments to tickets?
- What validation rules apply to comment text, including requiredness, minimum length, maximum length, and allowed characters?
- What metadata must be stored for history purposes?

## Functional Requirements
FR-1. The system shall allow an IT Support Agent to add a comment to a ticket.  
Source: US 1 Acceptance Criteria; BRD §59 REQ-001.

FR-2. The system shall associate each added comment with the ticket to which it was added.  
Source: Feature Description focus areas: tickets, comments, comment history.

FR-3. The system shall make comments added to a ticket available as part of that ticket's comment history over time.  
Source: Feature Description: "Enable IT Support Agents to add and view comment history on tickets over time."

FR-4. The system shall allow an IT Support Agent to view the comment history for a ticket.  
Source: Feature Description: "add and view comment history on tickets over time."

FR-5. The system shall restrict comment-creation capability to the IT Support Agent role unless additional permitted roles are defined by approved source requirements.  
Source: US 1 explicitly names IT Support Agents as the actor.

FR-6. The system shall reject comment-creation attempts that are not associated with a valid ticket identifier, if ticket identifiers are required by the implementation interface.  
Source: Implied by the requirement that comments are added to tickets; exact error contract pending clarification.

FR-7. The implementation shall preserve ticket comment records such that previously added comments remain retrievable as ticket comment history over time.  
Source: Feature Description: "comment history on tickets over time."

FR-8. The system shall expose comment history retrieval behavior sufficient for automated verification that a newly added comment is included in the associated ticket's comment history.  
Source: Derived from source-supported viewing requirement and TDD verifiability need.

## Testability Notes
Backend and service tests should cover:
- Successful creation of a comment for a valid ticket by an authorized IT Support Agent.
- Retrieval of comment history for a ticket after one or more comments have been added.
- Verification that a created comment is associated with the correct ticket.
- Authorization enforcement for comment creation by non-agent actors, if such actors exist in the implementation.
- Failure behavior when attempting to add a comment to a non-existent or invalid ticket reference.
- Persistence behavior ensuring comments remain available in ticket history over time.

## Non-Functional Requirements
Source-supported non-functional requirements:
- None explicitly stated in the source.

Implementation constraints supported by source:
- Architecture style: monolith.

Open Questions:
- Are there performance expectations for comment creation or retrieval?
- Are there security requirements for comment data access and storage?
- Are there audit, logging, or observability requirements for comment actions?
- Are there retention or backup requirements for comment history?
- Are there accessibility requirements for any UI exposing ticket comments?

## Acceptance Scenarios
### Scenario 1: IT Support Agent adds a comment to a ticket
Given an IT Support Agent has access to a ticket  
When the agent adds a comment to that ticket  
Then the system stores the comment against that ticket

### Scenario 2: IT Support Agent views comment history for a ticket
Given a ticket has one or more previously added comments  
When an IT Support Agent views the ticket's comment history  
Then the system displays the comments associated with that ticket

### Scenario 3: Added comment appears in ticket history over time
Given an IT Support Agent adds a comment to a ticket  
When the ticket's comment history is later retrieved  
Then the added comment is included in that ticket's comment history

### Scenario 4: Comment is associated only to the selected ticket
Given two different tickets exist  
And an IT Support Agent adds a comment to the first ticket  
When comment history is retrieved for both tickets  
Then the new comment appears in the first ticket's history  
And the new comment does not appear in the second ticket's history

### Scenario 5: Attempt to add a comment without a valid ticket association fails
Given a comment-creation request references a non-existent or invalid ticket  
When the request is submitted  
Then the system rejects the comment creation request

### Scenario 6: Unauthorized actor attempts to add a comment
Given a user who is not an IT Support Agent attempts to add a comment to a ticket  
When the user submits the comment  
Then the system denies the comment-creation attempt  
And no comment is added to the ticket history

## Traceability Matrix
| Source ID | Requirement | Acceptance Criteria | Test Coverage |
|---|---|---|---|
| US 1 | FR-1 | The system shall allow IT Support Agents to add comments to tickets. | Verify authorized IT Support Agent can create a comment on a valid ticket. |
| Feature Description | FR-2 | Comments are stored in association with the ticket they are added to. | Verify created comment is retrievable only from the associated ticket's history. |
| Feature Description | FR-3 | Comment history on tickets is viewable over time. | Verify previously added comments remain retrievable after creation. |
| Feature Description | FR-4 | IT Support Agents can view comment history on tickets over time. | Verify ticket comment history retrieval returns comments for the ticket. |
| US 1 | FR-5 | Comment creation is permitted for IT Support Agents. | Verify non-agent comment creation attempts are denied, if role model exists. |
| Feature Description + implied ticket association | FR-6 | Comments must be added to tickets, not to an undefined target. | Verify comment creation fails for invalid or non-existent ticket reference. |
| Feature Description | FR-7 | Ticket comments remain available as history over time. | Verify persistence and subsequent retrieval of created comments. |
| Feature Description | FR-8 | Comment history retrieval supports verification of newly created comments. | Verify newly added comment appears in subsequent history retrieval for the same ticket. |

## Open Questions
1. What application platform(s) will support ticket commenting?
2. What interface or screen will agents use to add comments and view comment history?
3. What are the exact permissions and authorization rules for viewing comment history?
4. Are roles other than IT Support Agents allowed to add or view comments?
5. What fields must a comment contain?
6. Is comment text required, and what are its validation rules?
7. Are empty or whitespace-only comments allowed?
8. Is there a maximum comment length?
9. Must comment history include author and timestamp metadata?
10. What ordering should be used when presenting comment history?
11. Are comments editable or deletable after creation?
12. What should the system return or display when ticket association is invalid?
13. Is comment history retrieval paginated or otherwise limited?
14. Are there any required integrations related to ticket comments?
15. Are there audit or retention requirements for comment history?
16. Are there accessibility, design, or content standards applicable to the UI?
17. What authentication mechanism identifies an IT Support Agent?
18. Should comment creation be immediately visible in comment history after submission?

## Source References
- Feature ID: 44604867
- Feature Reference: 44604867
- Feature Title: Ticket Commenting
- Feature Description: "Enable IT Support Agents to add and view comment history on tickets over time."
- User Story: US 1 - "The system shall allow IT Support Agents to add comments to tickets"
- User Story Acceptance Criteria: "The system shall allow IT Support Agents to add comments to tickets."
- Requirement Reference: BRD-BRD-IThelpdeskrequirements-1.0.pdf §59 REQ-001
- Source Document: BRD-BRD-IThelpdeskrequirements-1.0.pdf
- Source Reference Mentioned in Feature Description: BRD-BRD-IThelpdeskrequirements-1.0.pdf § ASTRA BRD-BRD-IThelpdeskrequirements-1.0.pdf §59 REQ-001
- Golden Repo convention references used: None provided in source context.