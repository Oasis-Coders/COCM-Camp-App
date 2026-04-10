-- Task Workflow Model Migration
--
-- Evolves the task status model from the original ('todo','in_progress','done','cancelled')
-- to the full lifecycle: ('draft','open','in_progress','blocked','done','cancelled').
--
-- Changes:
--   1. Widen the status check constraint
--   2. Rename existing 'todo' rows → 'open'
--   3. Add completed_at / completed_by columns
--   4. Trigger to auto-manage completed_at on status transitions
--   5. Add a delete policy for staff+

-- 1. Drop the old check constraint and create the new one
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('draft', 'open', 'in_progress', 'blocked', 'done', 'cancelled'));

-- 2. Migrate existing 'todo' rows to 'open'
update public.tasks set status = 'open' where status = 'todo';

-- 3. New completion-tracking columns
alter table public.tasks
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null;

-- 4. Trigger: auto-manage completed_at when a task moves to/from 'done'
create or replace function public.set_task_completed_fields()
returns trigger
language plpgsql
as $$
begin
  -- Moving into 'done': stamp the completion time
  if new.status = 'done' and (old.status is null or old.status != 'done') then
    new.completed_at = timezone('utc', now());
  end if;

  -- Moving out of 'done': clear completion fields
  if new.status != 'done' and old.status = 'done' then
    new.completed_at = null;
    new.completed_by = null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_task_completed on public.tasks;

create trigger set_task_completed
before update on public.tasks
for each row execute function public.set_task_completed_fields();

-- 5. Allow staff+ to delete tasks (no delete policy existed before)
create policy "tasks_staff_delete"
on public.tasks
for delete
using (public.has_any_role(array['super_admin', 'admin', 'staff']));
