# Approved Assumptions

- The application is a web UI backed by the existing Express API. Authentication is app-managed; no external identity provider or SSO is in scope.
- Users have one fixed role: Requester, Agent, Manager, or Admin. Permissions are fixed in code and default-deny on the server.
- Requesters can create and view their own tickets and add public comments. Agents can work assigned and unassigned tickets, claim unassigned tickets, and add public or internal comments. Managers can view and manage all tickets, assignments, reports, and SLA status. Admins have all capabilities and manage users and settings.
- The API returns 401 for missing/expired sessions and 403 for denied actions. The UI omits unavailable actions and presents an access-denied state for blocked routes.
- Admins alone can create, deactivate, and change user roles. Role changes are recorded in ticket-independent application audit events only if needed by the admin UI; ticket audit remains ticket-scoped.
- Sessions use random opaque identifiers in HttpOnly, SameSite cookies, with CSRF protection on state-changing requests. Passwords are stored as scrypt hashes.
- Local development seeds demo accounts for each role; demo seeding is disabled in production. No self-service registration is provided.
- Rationale: these choices implement the user's selected built-in identity and four-role model while keeping the monolith's API authoritative for access decisions.