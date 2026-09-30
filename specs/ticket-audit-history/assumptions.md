# Approved Assumptions

- This related feature uses the same ticket-scoped, append-only audit contract as `audit-history/assumptions.md`: actor, role, UTC timestamp, action, ticket, and relevant before/after values.
- Agents, Managers, and Admins can view audit events for tickets they can access; Requesters cannot view internal audit events. Audit writes are atomic with ticket changes and records are retained indefinitely.
- Rationale: the catalog contains overlapping audit features; one consistent contract avoids divergent event semantics.