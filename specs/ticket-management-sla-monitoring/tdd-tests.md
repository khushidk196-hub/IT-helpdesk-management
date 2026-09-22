# TDD Test Specifications: SLA Monitoring And Notifications

## Overview
These tests validate backend behavior for SLA monitoring and notification workflows in a monolith helpdesk system. The scope covers API endpoints, business logic, validation, persistence, role-based access, and integration points needed to track SLA status, identify overdue tickets, expose SLA/reporting data, and trigger notifications.

TDD approach:
1. Write failing tests for each acceptance criterion first.
2. Implement only the minimum code required to pass.
3. Refactor safely while keeping all tests green.
4. Proceed in business-priority order: SLA evaluation → overdue detection → notifications → reporting/access control.

## Unit Test Specifications

### SLA Target Resolution
- **Test:** resolves SLA target from ticket priority and category according to configured rules
  - **Given:** a ticket with valid priority/category and SLA policy definitions
  - **When:** SLA target is calculated at ticket creation or update
  - **Then:** the correct response/resolution target timestamps and policy identifier are assigned
  - **Priority:** High
  - **TDD Phase:** Red: assert target calculation exists and fails for unknown mapping; Green: implement minimal policy lookup; Refactor: extract policy resolver if repeated across services

- **Test:** rejects SLA calculation when required ticket fields for policy selection are missing
  - **Given:** a ticket missing required priority or category
  - **When:** SLA target calculation is requested
  - **Then:** validation error is returned and no SLA record is persisted
  - **Priority:** High
  - **TDD Phase:** Red: write failing validation test; Green: add minimal guard clauses; Refactor: centralize validation rules if reused

- **Test:** recalculates SLA target only when SLA-driving fields change
  - **Given:** an existing ticket with an SLA target
  - **When:** a non-SLA field is updated
  - **Then:** the existing SLA target remains unchanged
  - **Priority:** Medium
  - **TDD Phase:** Red: prove unwanted recalculation; Green: limit recalculation conditions; Refactor: isolate change-detection logic

### SLA Status Evaluation
- **Test:** marks ticket as within SLA before target breach
  - **Given:** a ticket with an active SLA target in the future
  - **When:** SLA status is evaluated
  - **Then:** status is reported as compliant/non-overdue with remaining time
  - **Priority:** High
  - **TDD Phase:** Red: assert expected status output; Green: implement minimal time comparison; Refactor: extract status evaluator if shared

- **Test:** marks ticket as overdue when current time passes unresolved SLA target
  - **Given:** an unresolved ticket whose SLA target is in the past
  - **When:** SLA status is evaluated
  - **Then:** status is overdue and breach duration is computed
  - **Priority:** High
  - **TDD Phase:** Red: create failing breach test; Green: add overdue evaluation; Refactor: separate duration formatting from core logic

- **Test:** excludes resolved tickets from overdue state once resolution is completed within policy rules
  - **Given:** a resolved ticket and recorded resolution timestamp
  - **When:** SLA status is evaluated after closure
  - **Then:** overdue monitoring does not continue beyond the terminal state
  - **Priority:** High
  - **TDD Phase:** Red: capture incorrect post-resolution breach behavior; Green: stop active monitoring for terminal states; Refactor: codify terminal-state rules

### Overdue Detection
- **Test:** identifies tickets newly entering overdue state
  - **Given:** active tickets near breach and current evaluation time
  - **When:** overdue detection job/service runs
  - **Then:** only tickets crossing the SLA threshold in that run are returned as newly overdue
  - **Priority:** High
  - **TDD Phase:** Red: expect only first-time breaches; Green: implement threshold crossing logic; Refactor: separate repository query and detector logic

- **Test:** does not repeatedly flag the same overdue ticket as newly overdue without state change
  - **Given:** a ticket already recorded as overdue/notified
  - **When:** overdue detection runs again with no ticket change
  - **Then:** duplicate newly-overdue event is not produced
  - **Priority:** High
  - **TDD Phase:** Red: demonstrate duplicate detection; Green: persist/check notification or breach marker; Refactor: abstract idempotency rule

- **Test:** excludes cancelled or closed tickets from overdue detection
  - **Given:** tickets in terminal non-actionable states
  - **When:** overdue detection runs
  - **Then:** they are not included in overdue results
  - **Priority:** High
  - **TDD Phase:** Red: assert terminal-state exclusion; Green: filter states; Refactor: consolidate eligible-state list

### Notification Rules
- **Test:** creates notification payload when a ticket becomes overdue
  - **Given:** a ticket detected as newly overdue
  - **When:** notification rule evaluation executes
  - **Then:** a notification event/message is generated with ticket reference, SLA type, breach time, and intended recipients
  - **Priority:** High
  - **TDD Phase:** Red: write failing event-generation test; Green: implement minimal payload builder; Refactor: extract template mapper if repeated

- **Test:** sends notifications to authorized recipients based on role and assignment
  - **Given:** a breached ticket with assigned agent, manager, and unrelated users
  - **When:** recipients are resolved
  - **Then:** only configured authorized recipients are selected
  - **Priority:** High
  - **TDD Phase:** Red: assert recipient filtering; Green: add minimal recipient resolution; Refactor: centralize role-based recipient policy

- **Test:** prevents duplicate overdue notifications for the same breach event
  - **Given:** a ticket already notified for its current overdue breach
  - **When:** notification processing repeats
  - **Then:** no duplicate notification is created or sent
  - **Priority:** High
  - **TDD Phase:** Red: prove duplicate send attempt; Green: add idempotency check; Refactor: reuse deduplication strategy across notification types

- **Test:** records notification delivery outcome for audit/reporting
  - **Given:** a notification dispatch attempt
  - **When:** the provider returns success or failure
  - **Then:** delivery status, timestamp, and failure reason if any are persisted
  - **Priority:** Medium
  - **TDD Phase:** Red: assert audit record requirement; Green: store minimal delivery result; Refactor: separate provider response mapping

### Reporting and Metrics
- **Test:** aggregates SLA performance metrics for manager reporting
  - **Given:** tickets with mixed compliant and breached SLA outcomes
  - **When:** SLA metrics are requested
  - **Then:** totals and breach/compliance counts are returned accurately
  - **Priority:** High
  - **TDD Phase:** Red: create failing aggregation test; Green: implement minimal counters; Refactor: extract metrics calculator when patterns repeat

- **Test:** includes overdue issue counts in support metrics
  - **Given:** active tickets across statuses including overdue tickets
  - **When:** support metrics are generated
  - **Then:** overdue counts are included and consistent with SLA status logic
  - **Priority:** High
  - **TDD Phase:** Red: verify overdue metric mismatch; Green: reuse SLA status source; Refactor: remove duplicated status calculations

- **Test:** restricts SLA performance metrics access to authorized manager roles
  - **Given:** users with manager and non-manager roles
  - **When:** metrics access is requested
  - **Then:** manager is allowed and unauthorized roles are denied
  - **Priority:** High
  - **TDD Phase:** Red: write failing authorization tests; Green: enforce minimal role check; Refactor: move access policy into shared authorization service if reused

### API Request Validation
- **Test:** rejects invalid SLA configuration or query parameters with clear validation errors
  - **Given:** malformed request values such as invalid date ranges, unsupported status filters, or missing required fields
  - **When:** the API endpoint is called
  - **Then:** a validation error response is returned and no processing occurs
  - **Priority:** High
  - **TDD Phase:** Red: assert invalid requests fail; Green: add request validation; Refactor: unify validator structures

- **Test:** returns not found when SLA details are requested for a non-existent ticket
  - **Given:** a ticket identifier that does not exist
  - **When:** SLA detail endpoint is called
  - **Then:** a not-found response is returned without leaking internal details
  - **Priority:** Medium
  - **TDD Phase:** Red: create missing-resource test; Green: add existence check; Refactor: standardize not-found handling

## Integration Test Specifications

### Ticket Lifecycle and SLA Persistence
- **Test:** ticket creation persists SLA targets and initial SLA status
  - **Given:** a valid ticket creation request with SLA-driving fields
  - **When:** the create ticket API completes
  - **Then:** the ticket and associated SLA tracking data are stored consistently
  - **Priority:** High

- **Test:** ticket update changes SLA data only when policy-relevant fields change
  - **Given:** an existing ticket and an update request
  - **When:** the API processes the update
  - **Then:** SLA persistence is updated only for relevant field changes and remains unchanged otherwise
  - **Priority:** High

### Overdue Processing Workflow
- **Test:** overdue monitoring job reads eligible tickets, marks breaches, and persists breach state
  - **Given:** stored tickets in mixed active and terminal states
  - **When:** overdue processing executes
  - **Then:** only eligible breached tickets are marked overdue and saved transactionally
  - **Priority:** High

- **Test:** overdue processing is idempotent across repeated runs
  - **Given:** a prior run already marked and notified current breaches
  - **When:** the same processing is run again without ticket changes
  - **Then:** no duplicate breach markers or notification records are created
  - **Priority:** High

### Notification Dispatch and Audit
- **Test:** overdue breach triggers notification dispatch and audit logging
  - **Given:** a ticket newly marked overdue and a configured notification provider
  - **When:** notification processing runs
  - **Then:** dispatch is attempted and audit/delivery records are persisted
  - **Priority:** High

- **Test:** notification provider failure does not lose breach state and records retry-eligible failure
  - **Given:** a newly overdue ticket and a failing provider integration
  - **When:** dispatch is attempted
  - **Then:** the overdue state remains persisted and the notification failure is recorded for follow-up
  - **Priority:** High

### Reporting and Access Control
- **Test:** SLA dashboard/report endpoint returns aggregated metrics sourced from persisted ticket/SLA data
  - **Given:** stored tickets with known SLA outcomes
  - **When:** an authorized manager requests SLA reporting data
  - **Then:** the response matches persisted facts for compliance, breaches, and overdue counts
  - **Priority:** High

- **Test:** unauthorized user is denied access to SLA monitoring/reporting endpoints
  - **Given:** an authenticated non-manager user
  - **When:** the user requests manager SLA metrics
  - **Then:** access is denied and no sensitive metrics are returned
  - **Priority:** High

## Acceptance Test Scenarios

### US 1 - SLA Tracking And Notifications
- **Scenario:** SLA data is created for a ticket
  - **Given:** a valid ticket is created with fields required for SLA policy selection
  - **When:** the ticket is saved
  - **Then:** SLA targets and initial tracking status are created for that ticket

- **Scenario:** Overdue ticket triggers notification
  - **Given:** an active ticket has exceeded its SLA target
  - **When:** SLA monitoring executes
  - **Then:** the ticket is marked overdue and notification records are created for intended recipients

- **Scenario:** Duplicate overdue notifications are prevented
  - **Given:** a ticket was already marked overdue and notified for the current breach
  - **When:** SLA monitoring executes again without a relevant ticket change
  - **Then:** no additional duplicate overdue notification is sent

- **Scenario:** Ticket terminal state stops active overdue monitoring
  - **Given:** a ticket has been resolved or cancelled
  - **When:** SLA monitoring evaluates ticket status
  - **Then:** the ticket is excluded from further active overdue escalation processing

### US 2 - SLA Performance And Overdue Monitoring For IT Managers
- **Scenario:** Manager can view SLA performance metrics
  - **Given:** persisted tickets with compliant and breached SLA outcomes
  - **When:** an authorized IT Manager requests SLA monitoring/report data
  - **Then:** the response includes SLA performance and overdue issue metrics

- **Scenario:** Unauthorized user cannot access manager SLA metrics
  - **Given:** a user without the required manager role
  - **When:** the user requests SLA monitoring/report data
  - **Then:** access is denied

- **Scenario:** Reporting reflects current overdue issues accurately
  - **Given:** active tickets include overdue and non-overdue items
  - **When:** an authorized manager requests support metrics
  - **Then:** overdue issue counts match the current SLA evaluation results

## Test-First Development Guidelines
1. **Write first (Red phase):**
   1. SLA target resolution for valid ticket inputs
   2. SLA evaluation for within-SLA vs overdue tickets
   3. Overdue detection for newly breached tickets only
   4. Duplicate-notification prevention
   5. Notification generation for overdue breaches
   6. Manager authorization for SLA metrics endpoints
   7. SLA metrics aggregation and overdue counts
   8. Request validation and not-found cases

2. **Implementation sequence (Green phase):**
   1. Implement minimal SLA policy resolver
   2. Implement minimal SLA status evaluator using current time vs target
   3. Add persistence for SLA tracking state on ticket create/update
   4. Implement overdue detection with terminal-state filtering
   5. Add idempotent breach/notification markers
   6. Implement notification recipient resolution and audit persistence
   7. Add reporting aggregation service and secured API endpoints
   8. Add validation/error handling paths

3. **Refactoring considerations (Refactor phase):**
   - Extract shared time/status calculation logic after it appears in 3+ tests/services
   - Centralize authorization and validation policies to avoid duplication
   - Separate domain rules from API orchestration for clean monolith boundaries
   - Ensure repository queries align with business rules for active vs terminal tickets
   - Re-run full suite after every extraction or rule consolidation

## Edge Cases & Boundary Tests
- Boundary condition tests
  - Ticket becomes overdue exactly at the SLA target timestamp
  - Ticket resolved exactly at the threshold is classified consistently per defined rule
  - Empty result sets return zeroed SLA metrics, not null/incorrect structures
  - Large date-range metric queries respect validation and still aggregate correctly

- Error handling tests
  - Missing or invalid priority/category prevents SLA creation
  - Non-existent ticket IDs return not found for SLA detail retrieval
  - Notification provider failure is captured without dropping overdue state
  - Invalid reporting filters or malformed date ranges return validation errors
  - Unauthorized role access returns denial without data leakage

- Concurrency/timing tests (if applicable)
  - Two monitoring executions running close together do not create duplicate breach markers
  - Concurrent notification attempts for the same overdue ticket remain idempotent
  - Ticket resolved during overdue processing does not result in inconsistent final SLA state
  - Time-based evaluations use a controllable time source to avoid flaky tests