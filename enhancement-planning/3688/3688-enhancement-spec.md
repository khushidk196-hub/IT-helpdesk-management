# Enhancement Planning Specification

## Requirement Understanding

Ticket SLA timing must be calculated from existing ticket data and kept accurate across the ticket lifecycle.

- **Business requirement**
  - Add SLA lifecycle tracking for support tickets so the system can determine whether a ticket is on track, at risk, breached, or overdue based on ticket priority, category, and lifecycle changes in the work item 3688 description.
  - Preserve the existing architecture direction from the work item: commit the core ticket action first, then emit normalized asynchronous notification or telemetry events so ticket processing is not blocked.
  - Support role-specific visibility already described in the work item: employees see only safe lifecycle state, while agents/managers/admins/ops can see operational SLA and delivery outcomes.

- **Functional requirement**
  - Calculate SLA targets from ticket priority and category at ticket creation.
  - Recalculate active SLA state as ticket status changes through creation, assignment/reassignment, status update, resolution, closure, escalation, warning, and breach events described in work item 3688.
  - Persist lifecycle timestamps and SLA-derived state so downstream ticket lists, details, dashboards, notifications, telemetry, and audit views can read consistent values.
  - Generate normalized post-commit events for SLA warning, SLA breach, escalation, and related lifecycle changes, matching the notification/telemetry flow described in work item 3688 and the broader notification feature family in `specs/.devx/change-maps/support-ticket-governance-suite.json`.
  - Enforce authorized views: employee-facing surfaces must expose only employee-safe SLA/lifecycle information; operational failure details remain limited to authorized agent/manager/admin/ops views per work item 3688.

- **Current vs expected behavior**
  - Current repository context shows existing ticket domains for creation, categorization/priority, lifecycle, work management, status tracking, information updates, and governance/notifications via change maps in:
    - `specs/.devx/change-maps/support-ticket-creation.json`
    - `specs/.devx/change-maps/ticket-categorization-priority-management.json`
    - `specs/.devx/change-maps/ticket-status-tracking.json`
    - `specs/.devx/change-maps/ticket-lifecycle-management.json`
    - `specs/.devx/change-maps/it-support-ticket-management.json`
    - `specs/.devx/change-maps/support-ticket-governance-suite.json`
  - Current explicit gap for this work item: no selected source files define an SLA engine or SLA persistence model.
  - Expected behavior: existing ticket actions continue to work, but each relevant action also updates SLA timing/state and emits follow-on SLA events without blocking the source transaction.

- **Assumptions and constraints**
  - Decision: implement as an extension of the current ticket domain and notification/governance flows, not a separate SLA subsystem, because all related repository guidance points to candidate areas inside the current repo and says to prefer extending existing modules over creating parallel implementations (`specs/.devx/change-maps/*.json` constraints).
  - Decision: use the lowest-risk SLA model of response/resolution countdown derived from existing ticket priority/category and lifecycle timestamps, because the work item requires accurate timers but provides no external SLA product or separate catalog.
  - Constraint: real file paths must be verified in the workspace before edits; current change maps are advisory only (`specs/.devx/change-maps/support-ticket-governance-suite.md`, `specs/.devx/change-maps/ticket-status-tracking.md`).
  - Constraint: do not redesign identity, service catalog, or unrelated help desk modules; keep implementation inside ticket, notification, authz, background jobs, and tests per repository guidance.

## Existing Application Analysis

The repository already organizes ticket work into feature areas that this SLA change must extend.

- **Relevant modules/components**
  - Ticket creation feature area is indicated by `specs/.devx/change-maps/support-ticket-creation.json`.
  - Ticket categorization/priority feature area is indicated by `specs/.devx/change-maps/ticket-categorization-priority-management.json` and `specs/.devx/change-maps/ticket-classification-priority-management.json`.
  - Ticket status and lifecycle feature areas are indicated by `specs/.devx/change-maps/ticket-status-tracking.json` and `specs/.devx/change-maps/ticket-lifecycle-management.json`.
  - Ticket management/workflow and collaboration areas are indicated by `specs/.devx/change-maps/it-support-ticket-management.json` and `specs/.devx/change-maps/support-ticket-management.json`.
  - Notification, monitoring, audit, and governance areas are indicated by `specs/.devx/change-maps/support-ticket-governance-suite.json`.

- **Existing business logic**
  - Existing business domains already cover ticket creation, status changes, information updates, assignment/reassignment, and lifecycle progression based on the feature map titles in the listed change-map files.
  - Existing architecture expectation already favors post-commit asynchronous event generation for notifications and telemetry from work item 3688.
  - Existing implementation guidance requires extension of discovered domain services rather than new parallel services (`specs/.devx/change-maps/support-ticket-governance-suite.json`, `specs/.devx/change-maps/ticket-status-tracking.json`).

- **Existing APIs**
  - Relevant current API categories to inspect are existing ticket create, update, assignment, status transition, detail/list, notification monitoring, and audit/configuration routes because those are the candidate areas called out in:
    - `specs/.devx/change-maps/support-ticket-creation.json`
    - `specs/.devx/change-maps/ticket-information-updates.json`
    - `specs/.devx/change-maps/it-support-ticket-management.json`
    - `specs/.devx/change-maps/support-ticket-governance-suite.json`
  - No concrete route files were supplied, so the implementation must modify discovered existing routes/controllers rather than inventing a new API surface.

- **UI components**
  - The work item’s design prompt identifies existing or planned UI surfaces that consume SLA/lifecycle data: My Tickets, Ticket Detail, Assigned Tickets, Agent Detail, Manager SLA dashboard, drill-downs, notification rules/config, telemetry, audit, and reusable badges/states.
  - These are background consumer surfaces for this feature; this work item’s implementation focus is the SLA calculation and lifecycle tracking data that those surfaces read.

- **Database/data model**
  - No concrete schema files or table definitions were supplied.
  - Decision: extend the existing ticket persistence model with SLA fields and lifecycle timestamps rather than adding a standalone SLA store, justified by the repository guidance to extend current data model/persistence areas in place (`specs/.devx/change-maps/ticket-status-tracking.json`, `specs/.devx/change-maps/ticket-lifecycle-management.json`).

- **External integrations**
  - Notification delivery channels and telemetry/audit integrations are background context from work item 3688 and `specs/.devx/change-maps/support-ticket-governance-suite.json`.
  - This enhancement must feed those existing integrations through normalized internal events; it does not introduce new external providers.

## Impact Analysis

This feature primarily impacts ticket domain logic, persistence, background events, and read models that surface SLA state.

- **Impacted applications/modules**
  - Ticket creation module: SLA target initialization on create.
  - Ticket categorization/priority module: source inputs for SLA policy lookup.
  - Ticket status/lifecycle module: pause/resume/complete/breach logic on transitions.
  - Ticket assignment/update module: event emission and timeline recording for operational changes.
  - Notification/governance module: consumption of SLA warning/breach/escalation events.
  - Supporting evidence from related repository feature maps:
    - `specs/.devx/change-maps/support-ticket-creation.json`
    - `specs/.devx/change-maps/ticket-categorization-priority-management.json`
    - `specs/.devx/change-maps/ticket-status-tracking.json`
    - `specs/.devx/change-maps/ticket-lifecycle-management.json`
    - `specs/.devx/change-maps/support-ticket-governance-suite.json`

- **Impacted services/components**
  - Ticket domain service handling create/update/status/assignment transitions.
  - Lifecycle history component/service that records timestamped ticket events.
  - Background event publisher/outbox/orchestration component used for notifications and telemetry.
  - Authorization-aware view mappers/DTOs for employee-safe versus operational SLA data.

- **Impacted APIs**
  - Existing ticket create API response may need to return initialized SLA state/targets used by confirmation/detail screens.
  - Existing ticket detail/list APIs may need to expose SLA state and timestamps to authorized roles.
  - Existing manager/ops dashboard APIs may need to filter or aggregate by SLA state.
  - Existing telemetry/audit APIs may need to include SLA-originated event types.

- **Impacted UI**
  - Employee ticket list/detail screens consume safe SLA state and lifecycle timestamps.
  - Agent ticket list/detail screens consume operational SLA state and warning/breach indicators.
  - Manager overview and drill-down views consume aggregates by SLA state.
  - Monitoring/audit views consume normalized SLA events and retry history.
  - The UI behaviors are derived from work item 3688, but this change should not create a separate UI-only implementation.

- **Impacted database objects**
  - Existing ticket table/document/entity: add SLA target fields, active timer values, current SLA state, and lifecycle timestamps.
  - Existing ticket history/event table/document/entity: add SLA-relevant lifecycle event records.
  - Existing notification/telemetry/audit tables/documents: add normalized SLA event types and outcomes where current structures already store event metadata.
  - Exact objects must be confirmed in workspace before implementation.

- **Impacted integrations**
  - Internal notification orchestration receives new normalized events such as SLA_WARNING, SLA_BREACH, and ESCALATION already named in work item 3688.
  - Existing email/webhook/reporting flows consume those events without changing the source ticket transaction contract.

- **Potential downstream impact**
  - Existing reporting counts may change once tickets receive explicit SLA states.
  - Existing list sorting/filtering may need index or query updates if SLA state becomes a common filter.
  - Background processing volume will increase due to warning/breach events and recomputation on lifecycle changes.
  - Existing flows must still preserve restricted-data boundaries for employee-facing views, per work item 3688.

## Implementation Specification

The change should extend the existing ticket lifecycle pipeline to persist SLA state and emit SLA events after each committed lifecycle action.

- **Proposed solution**
  - Add SLA policy resolution to the existing ticket creation/update lifecycle so each ticket stores its applicable SLA target based on category and priority.
  - Add SLA state computation to the existing lifecycle transition handler so status changes update countdown/elapsed timing, breach timestamps, resolved/closed completion timestamps, and derived state.
  - Record SLA-relevant lifecycle events in the existing history/audit/event pipeline.
  - Publish normalized asynchronous events for SLA warning, breach, and escalation after the source ticket transaction commits, following the architecture stated in work item 3688.
  - Expose read-model fields for authorized ticket, manager, and ops views without exposing operational-only details to employees.

- **Code change areas**
  - Existing ticket creation service/controller/handler discovered from the workspace under the feature area referenced by `specs/.devx/change-maps/support-ticket-creation.json`.
  - Existing priority/category validation and mapping logic under the areas referenced by `specs/.devx/change-maps/ticket-categorization-priority-management.json` and `specs/.devx/change-maps/ticket-classification-priority-management.json`.
  - Existing status/lifecycle transition service/controller/handler under the areas referenced by `specs/.devx/change-maps/ticket-status-tracking.json` and `specs/.devx/change-maps/ticket-lifecycle-management.json`.
  - Existing notification/event/background processing code under the area referenced by `specs/.devx/change-maps/support-ticket-governance-suite.json`.
  - Existing tests adjacent to all modified files, per change-map instructions.

- **Detailed implementation approach**
  - Add an SLA policy lookup function in the existing ticket domain that resolves targets from current ticket category and priority values.
  - Persist, at minimum, these values on the existing ticket entity:
    - SLA policy key or resolved target snapshot
    - SLA start timestamp
    - SLA warning threshold timestamp
    - SLA breach due timestamp
    - Current SLA state (`On Track`, `At Risk`, `Breached`, `Overdue`)
    - Resolved timestamp
    - Closed timestamp
    - Last SLA evaluation timestamp
  - Add lifecycle evaluation logic triggered by existing ticket actions:
    - On create: initialize SLA snapshot and due timestamps.
    - On status update to active/in-progress states: continue countdown.
    - On status update to waiting/paused states already present in the discovered model: stop accrual using existing lifecycle semantics rather than inventing new ones.
    - On resolution/closure: finalize SLA tracking and persist terminal timestamps.
    - On category/priority changes already supported by existing flows: recompute SLA from the updated values and record an SLA recalculation lifecycle event.
  - Compute derived SLA state deterministically from persisted timestamps and current ticket status so reads are consistent across APIs and jobs.
  - Add a background evaluator path for time-based transitions:
    - Detect tickets crossing warning threshold and emit `SLA_WARNING`.
    - Detect tickets crossing due threshold and emit `SLA_BREACH`.
    - Detect escalation conditions already supported by the existing workflow/event model and emit `ESCALATION`.
  - Ensure event publication happens after the ticket transaction commits, matching work item 3688’s “core ticket action is committed first” rule.
  - Extend existing DTO/view mappers:
    - Employee-safe responses include current status, safe timeline labels, and safe SLA state only.
    - Agent/manager/ops responses include operational SLA state, warning/breach timestamps, and related notification outcomes according to role authorization.
  - Keep unauthorized/direct-route behaviors distinct from generic server failures, matching the work item UI rules.
  - Store immutable audit/telemetry outcomes for SLA-related notifications using the existing notification governance history model described in work item 3688.

- **Reuse vs new development**
  - Reuse existing ticket services, transition handlers, repositories, event publisher/background worker, authorization checks, and audit/telemetry persistence discovered in the workspace.
  - Create only the minimal new artifacts required by existing conventions:
    - SLA calculator/helper in the current ticket domain if no equivalent exists.
    - Schema migration for added ticket/history/event fields.
    - Tests covering new SLA behavior.
  - Do not create a standalone SLA microservice, new identity model, or separate event bus abstraction.

- **Configuration changes**
  - Add SLA policy configuration to the current application configuration source used for ticket domain rules.
  - Decision: represent SLA targets as configuration keyed by existing category and priority values because the work item requires rule-driven timing and no separate admin SLA catalog was supplied.
  - Add scheduler/worker configuration for periodic SLA threshold evaluation only if the current architecture already uses background workers; otherwise attach evaluation to existing polling/job infrastructure discovered in the repo.
  - Add event-type configuration/constants for `SLA_WARNING`, `SLA_BREACH`, and `ESCALATION` to the existing notification event catalog.

- **Data migration requirements**
  - Create a forward-only schema migration to add ticket SLA fields and any supporting history/event metadata columns or document properties.
  - Backfill existing open tickets with resolved SLA snapshots based on current category, priority, status, and available lifecycle timestamps from existing ticket history.
  - Mark backfilled records with the same deterministic calculation logic used for new tickets.
  - Leave closed historical tickets without synthetic warning/breach event emission during migration; persist current terminal SLA state only to avoid noisy downstream notifications.
  - Exact migration scripts and touched objects must follow the repository’s actual migration folder and naming conventions after workspace inspection.

## Testing & Regression

Testing must prove that SLA calculations are correct, role-safe, and non-breaking across existing ticket flows.

- **Unit test requirements**
  - SLA policy resolution by category and priority.
  - SLA state computation for newly created, active, paused/waiting, resolved, closed, breached, and overdue tickets.
  - Recalculation behavior when ticket category or priority changes through existing update flows.
  - Event eligibility logic for warning, breach, and escalation generation.
  - DTO/view mapping tests proving employee-safe payloads omit internal/ops-only details.

- **Integration test requirements**
  - Create ticket flow persists initialized SLA fields and returns expected safe data.
  - Status transition flow updates lifecycle timestamps and current SLA state correctly.
  - Assignment/reassignment/comment/update flows still commit successfully and publish normalized asynchronous events after commit.
  - Background evaluator or existing scheduled processing emits `SLA_WARNING` and `SLA_BREACH` once per threshold crossing and records immutable audit/telemetry outcomes.
  - Manager/ops APIs can filter or aggregate by SLA state using persisted values.
  - Unauthorized users receive access-denied responses without ticket or telemetry detail leakage.

- **Regression areas**
  - Support ticket creation.
  - Ticket categorization and priority updates.
  - Ticket status tracking and lifecycle history.
  - Ticket assignment/reassignment and collaboration activity.
  - Employee My Tickets and Ticket Detail data loading.
  - Agent ticket list/detail operational views.
  - Manager dashboard/drill-down filters.
  - Notification telemetry and audit history readers.
  - These regression surfaces align with repository feature maps and the work item UI prompt.

- **Negative scenarios**
  - Unknown or unmapped category/priority pair uses the current default SLA configuration and does not fail ticket creation.
  - Invalid status transition does not mutate SLA fields.
  - Unauthorized employee cannot access another ticket’s SLA or any internal notification failure details.
  - Retry or event publication failure does not roll back the committed ticket action; failure state is recorded in telemetry/audit as described in work item 3688.
  - Duplicate threshold processing does not emit duplicate warning/breach events for the same threshold crossing.
  - Backfill migration does not send customer-facing notifications for historical tickets.

- **Acceptance test scenarios**
  - Employee requester creates a ticket and can see the ticket reference, category, priority, current status, and employee-safe SLA/lifecycle state on their own ticket confirmation and detail flows; they cannot see internal notes, restricted delivery failures, or other users’ tickets.
  - Assigned agent views their assigned ticket list/detail and can see current SLA state plus lifecycle activity tied to assignment and status changes for tickets they are authorized to access.
  - Manager views the SLA overview and can filter tickets by date range, category, priority, queue, team, and agent while seeing counts for On Track, At Risk, Breached, and Overdue tickets.
  - Ops/admin-authorized user can view SLA-related telemetry/audit records, including warning/breach delivery outcomes and retry history, while retry actions create one new request and disable during execution.
  - Unauthorized user routed to ticket, drill-down, telemetry, or reporting/export pages receives a distinct access-denied response with no sensitive ticket or report metadata.
  - Existing create, update, assign, resolve, and close ticket flows still complete successfully while SLA updates and notification/telemetry events occur asynchronously after commit.

## AI Implementation Context

Implementation should proceed by extending discovered ticket and governance code paths, then adding schema and tests around them.

- **Implementation tasks**
  - Read the local handoff files identified in `specs/.devx/change-maps/support-ticket-governance-suite.json` and related ticket change maps before editing.
  - Discover the actual ticket entity/model, ticket lifecycle service, status transition handler, update/assignment flows, event publisher/background worker, authz guards, and adjacent tests in the current workspace.
  - Add SLA persistence fields to the existing ticket data model and create the matching migration.
  - Implement SLA calculation and lifecycle update logic inside the existing ticket domain service path.
  - Extend existing post-commit event generation to include SLA warning/breach/escalation events.
  - Extend existing query/DTO/view mapping for ticket detail/list and manager/ops readers.
  - Backfill existing open tickets in a migration or one-time application backfill job that follows repository conventions.
  - Add unit, integration, and regression tests near touched files.

- **Relevant coding standards**
  - Verify every suggested path in the IDE workspace before editing.
  - Prefer extending existing modules over creating parallel implementations.
  - Existing code patterns override generic guidance when they conflict.
  - Do not create a new repo or major folder structure unless the spec explicitly requires it.
  - These standards are stated across the provided change maps, including `specs/.devx/change-maps/support-ticket-governance-suite.json` and `specs/.devx/change-maps/ticket-status-tracking.json`.

- **Relevant existing patterns**
  - Feature-oriented ticket modules already exist by creation, status tracking, lifecycle, categorization, work management, and governance as shown by the change-map files.
  - Candidate implementation areas consistently include UI, API routes/services, data model/persistence, authentication/authorization, background work/events, and tests, which indicates the change should follow those current cross-layer patterns rather than creating new architectural seams.
  - Post-commit asynchronous notification/telemetry orchestration is the required event pattern from work item 3688.

- **Files/components to investigate**
  - `specs/.devx/project-context.md`
  - `specs/.devx/current-state.md`
  - `specs/.devx/implementation-check.md`
  - `specs/.devx/change-maps/support-ticket-governance-suite.json`
  - `specs/.devx/change-maps/support-ticket-governance-suite.md`
  - `specs/.devx/change-maps/ticket-status-tracking.json`
  - `specs/.devx/change-maps/ticket-lifecycle-management.json`
  - `specs/.devx/change-maps/support-ticket-creation.json`
  - `specs/.devx/change-maps/ticket-categorization-priority-management.json`
  - `specs/.devx/change-maps/it-support-ticket-management.json`
  - Actual discovered ticket model/entity, repository, service, route/controller, background worker, notification orchestration, telemetry/audit model, authz guard, and adjacent test files in the workspace before any edits.
  - Open question: actual code file paths, migration framework path, and concrete table/entity names are not supplied in the prompt and must be discovered in the workspace.

- **Acceptance criteria**
  - A user with employee/requester access can create and view their own tickets and sees employee-safe lifecycle/SLA data only: ticket id, category, priority, current status, lifecycle timestamps, and current SLA state; internal notes, routing rationale, provider responses, hidden metadata, and other users’ tickets remain inaccessible.
  - A user with agent access can view authorized assigned/queue tickets and sees operational SLA state updates after assignment, reassignment, comment, status change, resolution, and closure events.
  - A user with manager access can view authorized SLA dashboards and drill-downs that include counts and filters for On Track, At Risk, Breached, and Overdue tickets using persisted SLA state.
  - A user with admin or ops-authorized access can view SLA-related notification telemetry and immutable audit history, including `SLA_WARNING`, `SLA_BREACH`, and `ESCALATION` event outcomes.
  - Unauthorized users attempting direct ticket, telemetry, drill-down, or reporting/export access receive an access-denied result that reveals no restricted ticket or notification details.
  - Existing ticket creation, assignment/reassignment, status update, resolution, closure, comment, and notification-related flows continue to commit the source ticket action successfully even when downstream SLA event delivery, retry, or telemetry recording fails.
  - SLA timing is initialized from ticket priority and category at creation, updated on lifecycle changes, recalculated on existing category/priority changes, and persisted so subsequent reads return the same SLA state without recomputing from UI-only logic.