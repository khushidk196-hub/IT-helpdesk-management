# Implementation Requirements Checklist

**Purpose**: Provide an implementation acceptance checklist that agents can execute one item at a time.  
**Feature**: Role-Based Access Control

## Functional Acceptance Criteria

- [ ] Role-based access control is implemented across the monolith for all source-supported protected actions, routes, screens, and data operations
- [ ] Users can access only the application capabilities permitted by their assigned role(s), with observable allow/deny behavior in the application
- [ ] Unauthorized access attempts are blocked consistently for direct navigation, UI-triggered actions, and backend-invoked operations
- [ ] Permission checks are enforced server-side and are not dependent on UI visibility alone
- [ ] Any source-supported default role assignment, role change, or access revocation behavior is implemented and verified
- [ ] Primary access path, denied-access path, and failure handling for missing or invalid authorization context are implemented and verified
- [ ] If role hierarchy, multiple-role behavior, or permission inheritance is required by source-supported artifacts, it is implemented consistently across the feature
- [ ] No functional behavior is invented for missing user stories; unresolved authorization scope details remain unimplemented pending clarification

## UI Acceptance Criteria

- [ ] Protected navigation items, screens, controls, and actions are shown, hidden, disabled, or denied in accordance with source-supported role rules
- [ ] Unauthorized users receive a clear and consistent access-denied experience where source-supported
- [ ] Login/session-state transitions preserve correct role-based UI behavior after sign-in, sign-out, refresh, and session expiry where applicable
- [ ] Validation, messaging, and interaction patterns for denied or restricted actions follow existing local UI conventions
- [ ] Accessibility is preserved for protected UI states, including readable denied-state messaging and usable keyboard/screen-reader behavior where applicable
- [ ] Responsive behavior does not expose unauthorized actions or bypass role restrictions on different screen sizes
- [ ] Existing design-system and local UI conventions are followed for protected content and access-denied states

## API and Integration Acceptance Criteria

- [ ] API/service endpoints enforce role-based permissions for all source-supported protected operations
- [ ] Requests made without required roles or permissions return the correct authorization failure behavior and do not perform the protected operation
- [ ] Authenticated requests with sufficient roles or permissions succeed and return expected data and status behavior
- [ ] Authorization checks are applied consistently across controllers, services, repositories, and other monolith layers where relevant
- [ ] Any source-supported role or permission data contract is implemented with required inputs, outputs, and error handling
- [ ] Existing API contracts remain backward-compatible unless a source-supported requirement explicitly requires a breaking change
- [ ] External integrations, identity providers, or repository/provider behavior are updated only where explicitly supported by source context
- [ ] If the source does not define role source-of-truth, token claims, or integration behavior, those details are treated as Open Questions and must not be implemented as assumptions

## Business Logic and Data Acceptance Criteria

- [ ] Required role, permission, user-role, or related authorization entities and fields are implemented where source-supported
- [ ] Authorization rules for create, read, update, delete, administrative, and configuration actions are implemented where source-supported
- [ ] Data access is restricted so users cannot read or mutate protected records outside their authorization scope
- [ ] Any source-supported role assignment, revocation, migration, or persistence rules are implemented and verified
- [ ] Business rules for denied operations prevent partial writes, side effects, and inconsistent state changes
- [ ] Error handling covers unauthorized, forbidden, missing-role, invalid-role, and stale-session cases where applicable
- [ ] If auditing or authorization-event recording is required by source-supported artifacts, it is implemented for role changes and denied access events
- [ ] If role definitions, permission matrices, or scope boundaries are not defined in source context, they remain unresolved Open Questions and must not be silently assumed

## Non-Functional Acceptance Criteria

- [ ] Security expectations are satisfied by enforcing least privilege and preventing privilege escalation through UI, API, or direct request manipulation
- [ ] Permission enforcement is reliable under normal, repeated, and concurrent usage where applicable
- [ ] Observability is implemented for authorization failures and role-related errors where source-supported logging or monitoring conventions exist
- [ ] Performance remains acceptable for permission checks on protected routes and operations within the monolith context
- [ ] Implementation aligns with the selected monolith architecture and applies shared authorization logic consistently rather than duplicating rule behavior unnecessarily
- [ ] Only source-supported Golden Repo guidance, local standards, policies, and conventions are applied; no unsupported standards are invented
- [ ] Tests or verification steps cover highest-risk behavior, including authorized access, denied access, direct endpoint access, hidden/disabled UI states, and server-side enforcement
- [ ] TDD-specific artifacts are not introduced, because they are explicitly out of scope in the source context

## Traceability

- [ ] Every implemented RBAC change maps back to source-supported feature context, derived source signals, or related acceptance behavior from the provided materials
- [ ] Every implemented permission rule, protected endpoint, UI restriction, and data restriction has a traceable source-supported rationale
- [ ] Every non-blocking Open Question that was implemented has a recorded decision + one-line rationale in `specs/<slug>/assumptions.md` (no Open Question is silently assumed)
- [ ] No BLOCKING Open Question was implemented as an assumption (a feature with an unresolved blocking question is held at needs-clarification, not completed)
- [ ] Missing user stories, undefined role matrices, undefined permission scopes, and undefined identity/claim details are treated as unresolved until clarified, not inferred into implementation

## Notes

- Never resolve an Open Question silently. In an unattended run, record the chosen assumption + rationale in `specs/<slug>/assumptions.md`; blocking questions must instead hold the feature at needs-clarification.
- Mark an item complete only after verifying actual implementation code and behavior.