# IT Help Desk Management

> Auto-generated project context for AI-assisted development.
> Last updated: 2026-09-25

**Organization:** delta-studio

## Development Methodology

This project follows **Spec-Driven Development (SDD)**.

Every feature has:
- `specs.md` — Full technical specification
- `requirements.md` — Implementation acceptance checklist
- `prompt.md` — Ready-to-use implementation prompt

## Features (36)

- **Ticket Categorization And Priority Management** (0 user stories)
- **Ticket Resolution Management** (0 user stories)
- **Ticket Commenting** (0 user stories)
- **End-to-End Ticket Lifecycle Management** (0 user stories)
- **Ticket Classification And Priority Management** (0 user stories)
- **User Ticket Submission And Tracking** (0 user stories)
- **Ticket Assignment** (0 user stories)
- **End-to-End Ticket Lifecycle Continuity** (0 user stories)
- **Ticket Lifecycle Workflow** (0 user stories)
- **Ticket Status Tracking** (0 user stories)
- **Ticket Lifecycle Workflow Validation** (0 user stories)
- **Ticket Work Management** (0 user stories)
- **Ticket Information Update During Processing** (0 user stories)
- **Ticket Lifecycle Management** (0 user stories)
- **Ticket Assignment And Updates** (0 user stories)
- **Ticket Detail Capture** (0 user stories)
- **Ticket Management And Collaboration** (0 user stories)
- **As an Employee, I want to receive notifications when my support ticket changes so that I stay informed about progress and required actions; As an IT Support Agent, I want to receive notifications when a support ticket is assigned or reassigned so that I can act on owned work without delay; As an IT Support Agent, I want ticket lifecycle events to trigger notifications so that stakeholders are informed of ticket activity (+83 more)** (86 user stories)
- **Ticket Ownership Assignment** (0 user stories)
- **Role-Based Access And Administration** (0 user stories)
- **Ticket Viewing** (0 user stories)
- **Ticket Lifecycle State Visibility** (0 user stories)
- **Ticket Categorization** (0 user stories)
- **Operational Dashboards And Reports** (0 user stories)
- **Audit History** (0 user stories)
- **Administration Management** (0 user stories)
- **Agent Ticket Viewing** (0 user stories)
- **Verifiable Critical Workflow Outcomes** (0 user stories)
- **Role-Based Access Control** (0 user stories)
- **Agent Ticket Operations** (0 user stories)
- **Ticket Information Updates** (0 user stories)
- **Support Ticket Creation** (0 user stories)
- **Centralized IT Help Desk Platform** (0 user stories)
- **Ticket Audit History** (0 user stories)
- **End-to-End Workflow Testability** (0 user stories)
- **SLA Monitoring And Notifications** (0 user stories)

## Getting Started

1. Read this file for project context
2. Check `specs/.devx/workflow.md` for the development workflow
3. Review `specs/.devx/instruction.md` for architecture and multi-repo rules
4. Pick a feature from `specs/.devx/features.json`
5. Open the feature's `prompt.md` and use it with your AI assistant
6. Follow the spec and requirements to implement

## Project Structure

```
specs/
  .devx/
    project.md          ← You are here
    workflow.md          ← Development workflow
    features.json        ← Feature index (machine-readable)
    tracker.json         ← Code-generation execution status
    generation.json      ← Last generation metadata
    architecture.md      ← System architecture
    init.sh              ← Setup AI tool configs
  <feature-slug>/
    specs.md             ← Technical specification
    requirements.md      ← Implementation acceptance checklist
    prompt.md            ← Implementation prompt
```

## AI Tool Setup

Run the init script to configure your AI tools automatically:

```bash
bash ./specs/.devx/init.sh
```

If you want execute permissions as well:

```bash
  chmod +x ./specs/.devx/init.sh && ./specs/.devx/init.sh
```

The script lists supported AI tools, lets you choose one, and creates only that tool's config files.
