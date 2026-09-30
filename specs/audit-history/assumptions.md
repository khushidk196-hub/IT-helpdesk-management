# Approved Assumptions

- Ticket audit history is append-only and stores ticket ID, UTC timestamp, actor ID/role, action, and relevant before/after values.
- Ticket creation, edits, status changes, assignment changes, comments, soft deletion, and SLA warning/breach events create audit entries in the same database transaction as the originating action.
- Audit history is available in ticket details and the API to Agents, Managers, and Admins; Requesters see only their public conversation, not internal audit events. Audit records cannot be edited or deleted and are retained indefinitely.
- A failed audit write rolls back the originating ticket action. Audit records are ticket-scoped; general security-event logging is not included in this feature.
- Rationale: these choices implement the user's staff-only, immutable audit preference and prevent actions from succeeding without their required history.