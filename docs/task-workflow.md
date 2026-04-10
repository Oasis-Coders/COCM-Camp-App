# Task Workflow

This document defines the task lifecycle used across the COCM Camp App. Every team member should reference it for a shared vocabulary around status, priority, and assignment.

## Status Model

Tasks follow a linear lifecycle with one branch for blockers:

```
  ┌─────────┐    publish    ┌──────┐   claim/begin   ┌─────────────┐
  │  Draft   │─────────────▶│ Open │───────────────▶│ In Progress  │
  └─────────┘               └──────┘                 └──────┬───────┘
       │                       │ │                          │ │
       │                       │ │ quick close              │ │ blocker
       │ discard               │ ▼                          │ ▼
       │                   ┌──────┐                     ┌─────────┐
       └──────────────────▶│Cancel│◀────────────────────│ Blocked  │
                           └──────┘                     └────┬─────┘
                               ▲                             │
                               │          unblock            │
                           ┌───┴──┐◀─────────────────────────┘
                           │ Done │
                           └──────┘
```

### Status Definitions

| Status          | Meaning                                                                | Visible to Assignee? |
| --------------- | ---------------------------------------------------------------------- | -------------------- |
| **Draft**       | Created by staff/admin during planning. Not yet actionable.            | No                   |
| **Open**        | Published and ready for work. Assignee can see it and begin.           | Yes                  |
| **In Progress** | Actively being worked on.                                              | Yes                  |
| **Blocked**     | Paused — there is an external dependency or issue preventing progress. | Yes                  |
| **Done**        | Completed successfully. Terminal state.                                | Yes                  |
| **Cancelled**   | Abandoned or no longer relevant. Terminal state.                       | Yes                  |

### Allowed Transitions

| From        | Can move to                  |
| ----------- | ---------------------------- |
| Draft       | Open, Cancelled              |
| Open        | In Progress, Done, Cancelled |
| In Progress | Blocked, Done, Cancelled     |
| Blocked     | In Progress, Cancelled       |
| Done        | _(terminal)_                 |
| Cancelled   | _(terminal)_                 |

> **Note:** Once a task reaches `Done` or `Cancelled`, it cannot be reopened. If the work needs to resume, create a new task.

## Priority Levels

| Priority   | When to use                                                        |
| ---------- | ------------------------------------------------------------------ |
| **Low**    | Nice-to-have work. No deadline pressure.                           |
| **Medium** | Standard operational work. Should be done before the event.        |
| **High**   | Important and time-sensitive. Needs attention this week.           |
| **Urgent** | Blocking other work or safety-critical. Needs immediate attention. |

## Assignment Rules

| Rule                      | Detail                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **Who creates**           | Staff, Admin, or Super Admin                                                           |
| **Who can be assigned**   | Any profile (including participants for volunteer tasks)                               |
| **Who can reassign**      | Staff+ only                                                                            |
| **Who can change status** | Assignee can move forward (open→in_progress→done). Staff+ can do any valid transition. |
| **Self-assign**           | Staff+ can assign themselves. Participants cannot self-assign.                         |
| **Unassigned tasks**      | Allowed. Visible only to staff+. A staff member can claim them.                        |

## Event Linking

Tasks may optionally be linked to an event via `event_id`. This groups operational work by camp/retreat. When viewing an event, staff can see all linked tasks.

## Completion Tracking

When a task moves to `Done`:

- `completed_at` is automatically set by a database trigger
- `completed_by` records who marked it done (which may differ from the assignee)

If a task is reopened (moved out of `Done`), both fields are cleared.

## Technical Reference

The single source of truth for status constants, transition rules, and type guards lives in:

```
lib/tasks/task-model.ts
```

All components and server actions import from this file. Never hardcode status strings elsewhere.
