# Implementation Check

> Auto-generated local readiness gate for IDE code generation.
> Generated: 2026-09-29T07:25:46Z

## Status

FAIL

## Findings

- Missing change map: specs/.devx/change-maps/business-user-ticket-creation.md
- Missing machine-readable change map: specs/.devx/change-maps/business-user-ticket-creation.json
- Missing change map: specs/.devx/change-maps/ticketing-admin-management.md
- Missing machine-readable change map: specs/.devx/change-maps/ticketing-admin-management.json
- Missing change map: specs/.devx/change-maps/ticket-management-reporting.md
- Missing machine-readable change map: specs/.devx/change-maps/ticket-management-reporting.json
- Missing change map: specs/.devx/change-maps/ticket-management-sla-monitoring.md
- Missing machine-readable change map: specs/.devx/change-maps/ticket-management-sla-monitoring.json
- Missing change map: specs/.devx/change-maps/verifiable-critical-workflow-outcomes.md
- Missing machine-readable change map: specs/.devx/change-maps/verifiable-critical-workflow-outcomes.json

## Gate Semantics

- PASS: required local context, feature files, change maps, and any generated guidance package are present.
- CONCERNS: implementation can proceed after human confirmation of the listed warnings.
- FAIL: do not code until the missing local handoff files are regenerated or restored.

## Required Before Coding

- [ ] Read `specs/.devx/project-context.md`.
- [ ] Read `specs/.devx/current-state.md`.
- [ ] Read the selected feature change map under `specs/.devx/change-maps/`.
- [ ] Read local Golden Repo guidance under `specs/.devx/guidance/` when present.
- [ ] Confirm the owning code area by inspecting actual files.

## Rule

Do not start implementation from a Golden Repo link or Astra-only context. Use local files committed or copied with the specs.
