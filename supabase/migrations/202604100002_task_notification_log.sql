-- Task Notification Log
--
-- Stores every task notification event emitted by the application.
-- This table is append-only and serves as the audit trail for
-- what notifications were generated and who they were addressed to.
--
-- A future delivery layer will read from this table (or subscribe
-- to Supabase Realtime) to actually send emails / push / in-app.

create table if not exists public.task_notification_log (
  id uuid primary key default gen_random_uuid(),

  -- Which event occurred
  event_name text not null check (event_name in (
    'task.created',
    'task.assigned',
    'task.unassigned',
    'task.status_changed',
    'task.completed',
    'task.reopened',
    'task.updated',
    'task.deleted',
    'task.overdue'
  )),

  -- References
  task_id uuid not null,  -- intentionally not FK — task may be deleted
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,

  -- Human-readable summary
  summary text not null,

  -- Full event payload as JSONB for flexibility
  payload jsonb not null default '{}'::jsonb,

  -- Delivery tracking (for future use)
  read_at timestamptz,
  delivered_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default timezone('utc', now())
);

-- Index for "my notifications" queries
create index if not exists idx_task_notification_log_recipient
  on public.task_notification_log (recipient_id, created_at desc);

-- Index for "notifications about this task"
create index if not exists idx_task_notification_log_task
  on public.task_notification_log (task_id, created_at desc);

-- RLS
alter table public.task_notification_log enable row level security;

-- Recipients can read their own notifications
create policy "notification_log_recipient_read"
on public.task_notification_log
for select
using (
  recipient_id = auth.uid()
  or public.has_any_role(array['super_admin', 'admin'])
);

-- Staff+ can insert (server actions run with service role, but
-- for safety we also allow staff to insert through RLS)
create policy "notification_log_staff_insert"
on public.task_notification_log
for insert
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

-- Recipients can mark their own notifications as read
create policy "notification_log_recipient_update"
on public.task_notification_log
for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
