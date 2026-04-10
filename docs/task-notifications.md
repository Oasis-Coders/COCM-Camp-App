# Task Notification Trigger Points

This document defines every event that can trigger a task-related notification, who receives it, and where in the code it fires.

## Event Catalog

| Event Name            | Trigger                                        | Default Recipients                      |
| --------------------- | ---------------------------------------------- | --------------------------------------- |
| `task.created`        | Staff creates a new task                       | Assignee (if set)                       |
| `task.assigned`       | Task is assigned to someone                    | New assignee + previous assignee        |
| `task.unassigned`     | Task is unassigned (assignee set to null)      | Previous assignee                       |
| `task.status_changed` | Task moves between non-terminal statuses       | Assignee + creator                      |
| `task.completed`      | Task moves to `done`                           | Assignee + creator                      |
| `task.reopened`       | (Reserved) Task would move out of terminal     | Assignee                                |
| `task.updated`        | Task details changed (title, priority, due, …) | Assignee                                |
| `task.deleted`        | Task is permanently deleted                    | Assignee                                |
| `task.overdue`        | (System) Task passes its due date while open   | Assignee                                |

## Recipient Rules

1. **The actor is never notified about their own action.** If a staff member assigns a task to themselves, they won't get an assignment notification.
2. Recipients are resolved from the event payload and optional context (creator, current assignee).
3. Recipients are deduplicated — even if someone is both creator and assignee, they receive the notification once.

## Architecture

```
Server Action (app/tasks/actions.ts)
  │
  ├─ Primary DB operation (insert/update/delete)
  │
  └─ emitTaskEvent()        ← fire-and-forget, never throws
       │
       ├─ resolveRecipients()  → determine who should be notified
       ├─ eventSummary()       → human-readable description
       ├─ console.info()       → dev observability
       └─ INSERT into task_notification_log  → persistent record
```

### Key Design Decisions

- **Fire-and-forget**: `emitTaskEvent()` catches all errors. A notification failure must never block or fail a task operation.
- **Application-layer triggers**: Events are emitted from server actions, not database triggers. This gives us access to the actor's identity and lets us build richer payloads.
- **Log table as source of truth**: The `task_notification_log` table records every event. A future delivery layer can read from this table (or subscribe via Supabase Realtime) to send emails, push notifications, or in-app toasts.
- **Delivery is decoupled**: This PR only defines *what* events happen and *who* should be told. The *how* (email, push, in-app) is a separate concern.

## Database: `task_notification_log`

| Column         | Type        | Description                                   |
| -------------- | ----------- | --------------------------------------------- |
| `id`           | uuid PK     | Auto-generated                                |
| `event_name`   | text        | One of the event names above                  |
| `task_id`      | uuid        | Which task (not FK — task may be deleted)      |
| `recipient_id` | uuid FK     | Who should see this notification               |
| `actor_id`     | uuid FK     | Who triggered it (null for system events)      |
| `summary`      | text        | Human-readable description                     |
| `payload`      | jsonb       | Full event payload for flexible rendering      |
| `read_at`      | timestamptz | When recipient read it (future use)            |
| `delivered_at` | timestamptz | When it was delivered (future use)             |
| `created_at`   | timestamptz | When the event was emitted                     |

### RLS Policies

- Recipients can read their own notifications
- Admins can read all notifications
- Staff+ can insert (server actions create rows)
- Recipients can update their own rows (to mark as read)

## File Map

| File                                                 | Purpose                                  |
| ---------------------------------------------------- | ---------------------------------------- |
| `lib/notifications/task-events.ts`                   | Event types, recipient resolution, summaries |
| `lib/notifications/emit.ts`                          | Fire-and-forget emitter function          |
| `app/tasks/actions.ts`                               | Server actions with notification triggers |
| `supabase/migrations/202604100002_task_notification_log.sql` | Log table migration              |
| `tests/task-events.test.ts`                          | Unit tests for event model               |

## Adding a New Event

1. Add the event name to `TASK_EVENT_NAMES` in `lib/notifications/task-events.ts`
2. Define a payload type (`TaskXxxPayload`)
3. Add it to the `TaskNotificationEvent` discriminated union
4. Add recipient resolution logic in `resolveRecipients()`
5. Add a summary template in `eventSummary()`
6. Call `emitTaskEvent()` from the relevant server action
7. Add the event name to the DB check constraint if needed
8. Write tests
