create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'waitlisted', 'cancelled')),
  notes text,
  registered_at timestamptz not null default timezone('utc', now()),
  unique (event_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  event_id uuid references public.events(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkin_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_by uuid references public.profiles(id) on delete set null,
  checked_in_at timestamptz not null default timezone('utc', now()),
  method text not null default 'manual' check (method in ('qr', 'manual', 'code')),
  notes text,
  unique (event_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  visibility text not null default 'public' check (visibility in ('public', 'staff', 'admin', 'direct')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (channel_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.tasks enable row level security;
alter table public.checkin_codes enable row level security;
alter table public.checkins enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
  );
$$;

create or replace function public.has_any_role(role_names text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = any (role_names)
  );
$$;

create policy "profiles_self_select"
on public.profiles
for select
using (id = auth.uid() or public.has_any_role(array['super_admin', 'admin']));

create policy "profiles_self_update"
on public.profiles
for update
using (id = auth.uid() or public.has_any_role(array['super_admin', 'admin']))
with check (id = auth.uid() or public.has_any_role(array['super_admin', 'admin']));

create policy "roles_admin_read"
on public.roles
for select
using (public.has_any_role(array['super_admin', 'admin']));

create policy "user_roles_admin_read"
on public.user_roles
for select
using (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin']));

create policy "events_public_read_published"
on public.events
for select
using (
  status = 'published'
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "events_staff_write"
on public.events
for all
using (public.has_any_role(array['super_admin', 'admin', 'staff']))
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "registrations_self_read"
on public.event_registrations
for select
using (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "registrations_self_create"
on public.event_registrations
for insert
with check (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "registrations_self_update"
on public.event_registrations
for update
using (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']))
with check (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "tasks_assignee_or_staff_read"
on public.tasks
for select
using (
  assigned_to = auth.uid()
  or created_by = auth.uid()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "tasks_staff_create"
on public.tasks
for insert
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "tasks_assignee_or_staff_update"
on public.tasks
for update
using (
  assigned_to = auth.uid()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
)
with check (
  assigned_to = auth.uid()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "checkin_codes_staff_manage"
on public.checkin_codes
for all
using (public.has_any_role(array['super_admin', 'admin', 'staff']))
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "checkins_self_or_staff_read"
on public.checkins
for select
using (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "checkins_staff_create"
on public.checkins
for insert
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "channels_member_or_staff_read"
on public.channels
for select
using (
  visibility = 'public'
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "channel_members_self_or_staff_read"
on public.channel_members
for select
using (user_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "messages_member_or_staff_read"
on public.messages
for select
using (
  sender_id = auth.uid()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "messages_member_create"
on public.messages
for insert
with check (sender_id = auth.uid() or public.has_any_role(array['super_admin', 'admin', 'staff']));
