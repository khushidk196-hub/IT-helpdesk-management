# Approved Assumptions

- Ownership is a single active Agent, selected from active Agents in the web ticket detail view. It can be assigned after creation; Requesters cannot set ownership.
- Managers and Admins can assign/reassign any active ticket. Agents can claim unassigned tickets. Closed or Resolved tickets cannot be assigned, and assignment does not change status.
- Repeating the current assignment is a no-op. Ownership changes retain previous/new owner, actor, and UTC timestamp in ticket audit history and notify the new owner in-app.
- Rationale: the user approved manual single-agent assignment; these details provide deterministic UI, validation, and history behavior.