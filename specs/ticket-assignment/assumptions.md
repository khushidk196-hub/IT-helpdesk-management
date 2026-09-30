# Approved Assumptions

- A ticket has at most one current assignee, who must be an active Agent.
- Assignment is manual. Managers and Admins can assign or reassign any active ticket; Agents may claim an unassigned ticket but cannot assign it to another Agent. Requesters cannot assign tickets.
- Assignment is available after creation and does not change ticket status. Resolved and Closed tickets cannot be assigned; reassignment to the current Agent is a no-op.
- Every successful assignment change is recorded in ticket audit history and creates an in-app notification for the new assignee. No automatic routing or workload-balancing rule is included.
- Rationale: these defaults implement the user's selected single-agent/manual workflow and make ownership visible without adding unsupported automation.