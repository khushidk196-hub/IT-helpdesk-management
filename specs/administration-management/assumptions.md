# Approved Assumptions

- Admins can create/deactivate users, assign one of the fixed roles, manage ticket categories, edit priority-based SLA targets, and manage in-app notification preferences.
- Roles and their permission matrix are fixed application definitions; Admins assign roles but cannot create custom roles or edit permission rules.
- Categories in use are deactivated rather than deleted. The final active category cannot be removed. Priority values remain the fixed Critical/High/Medium/Low set.
- Administrative changes to users, roles, categories, and SLA policies are recorded in the relevant ticket audit history only when a ticket is affected; configuration itself is persisted in SQLite.
- Rationale: this applies the user's approved administration scope while preserving referential integrity and a bounded fixed-role model.