# Approved Assumptions

- Supported actors are Requester, Agent, Manager, and Admin, with one fixed role per account and the permission matrix recorded in `role-based-access-control/assumptions.md`.
- Admins can create/deactivate users and change their fixed role; custom roles and permission editing are not supported.
- Managers can view operational/SLA data and manage tickets, but only Admins can change user roles, categories, SLA targets, or application settings.
- The administration surface is the web UI, protected by server-side authorization on every corresponding API operation.
- Rationale: this realizes the user's approved four-role model and admin scope without inventing a configurable policy engine.