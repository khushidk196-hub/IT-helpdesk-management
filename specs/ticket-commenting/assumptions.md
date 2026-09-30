# Approved Assumptions

- Comments are ticket-scoped, required non-empty plain text, maximum 10,000 characters, and displayed oldest first with author and UTC timestamp.
- Requesters may add public replies only to their own tickets. Agents, Managers, and Admins may add public replies or internal notes on tickets they can access. Internal notes are never exposed to Requesters.
- Comments are immutable: editing and deletion, attachments, mentions, rich text, and threading are out of scope. A comment is committed with its audit event atomically.
- New public replies notify the other ticket participants in-app. Internal notes notify permitted support staff only.
- Rationale: this applies the user's approved public/internal split while keeping conversation history auditable and access-filtered.