# Approved Assumptions

- SLA clocks use elapsed 24/7 time, start when a ticket is created, and use configurable first-response/resolution targets by priority: Critical 1h/4h, High 4h/8h, Medium 8h/24h, Low 24h/72h.
- First response means the first public reply by support staff. Internal notes do not stop that clock. Resolution stops the active resolution clock; reopening starts a new resolution interval while retaining prior audit history.
- One warning is generated at 75% of a target and one breach event when overdue. Assignment and SLA warnings/breaches create in-app notifications for the assignee and Managers; unassigned tickets notify Managers. No email/SMS integration or escalation chain is included.
- SLA rules are editable by Admins only. SLA status is visible to Agents, Managers, and Admins; Requesters see status only for their own tickets.
- Rationale: the user approved 24/7 targets, a 75% warning, and in-app notifications; these definitions make timer transitions testable.