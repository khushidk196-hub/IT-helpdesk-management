# Approved Assumptions

- The dashboard reports ticket counts by status, priority, and category; agent workload; ticket volume and resolution trends; and SLA attainment/breaches.
- Reports default to the prior 30 days, support date filtering, and can be exported as CSV. Dates are stored as UTC instants and displayed in the browser's local timezone.
- Admins and Managers can see all operational records. Agents see assigned and unassigned queue work. Requesters see only their own ticket activity; unauthorized records are excluded server-side from both reports and exports.
- Metrics are computed from persisted ticket, assignment, and SLA events on request; no external BI system, scheduled report delivery, or snapshot store is included.
- Rationale: this implements the user's selected standard operational dashboard and CSV export without inventing external reporting integrations.