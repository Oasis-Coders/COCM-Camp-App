alter table public.profiles
add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists preferred_name text;

create or replace function public.resolve_profile_display_name(
  preferred_name text,
  first_name text,
  last_name text,
  email text
)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(preferred_name), ''),
    nullif(trim(concat_ws(' ', first_name, last_name)), ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'Camp user'
  );
$$;

create or replace function public.sync_profile_derived_fields()
returns trigger
language plpgsql
as $$
begin
  new.display_name = public.resolve_profile_display_name(
    new.preferred_name,
    new.first_name,
    new.last_name,
    new.email
  );
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger sync_profiles_derived_fields
before insert or update on public.profiles
for each row execute function public.sync_profile_derived_fields();

update public.profiles
set preferred_name = coalesce(preferred_name, display_name)
where preferred_name is null;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid;
  participant_role_id uuid;
begin
  insert into public.profiles (
    auth_user_id,
    email,
    first_name,
    last_name,
    preferred_name
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(
      new.raw_user_meta_data ->> 'preferred_name',
      new.raw_user_meta_data ->> 'display_name'
    )
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    preferred_name = coalesce(excluded.preferred_name, public.profiles.preferred_name)
  returning id into new_profile_id;

  select id
  into participant_role_id
  from public.roles
  where name = 'participant'
  limit 1;

  if participant_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new_profile_id, participant_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

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
    where ur.user_id = public.current_profile_id()
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
    where ur.user_id = public.current_profile_id()
      and r.name = any (role_names)
  );
$$;

drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "user_roles_admin_read" on public.user_roles;
drop policy if exists "registrations_self_read" on public.event_registrations;
drop policy if exists "registrations_self_create" on public.event_registrations;
drop policy if exists "registrations_self_update" on public.event_registrations;
drop policy if exists "tasks_assignee_or_staff_read" on public.tasks;
drop policy if exists "tasks_assignee_or_staff_update" on public.tasks;
drop policy if exists "checkins_self_or_staff_read" on public.checkins;
drop policy if exists "channel_members_self_or_staff_read" on public.channel_members;
drop policy if exists "messages_member_or_staff_read" on public.messages;
drop policy if exists "messages_member_create" on public.messages;

create policy "profiles_self_select"
on public.profiles
for select
using (
  auth_user_id = auth.uid()
  or public.has_any_role(array['super_admin', 'admin'])
);

create policy "profiles_self_update"
on public.profiles
for update
using (
  auth_user_id = auth.uid()
  or public.has_any_role(array['super_admin', 'admin'])
)
with check (
  auth_user_id = auth.uid()
  or public.has_any_role(array['super_admin', 'admin'])
);

create policy "user_roles_admin_read"
on public.user_roles
for select
using (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin'])
);

create policy "registrations_self_read"
on public.event_registrations
for select
using (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "registrations_self_create"
on public.event_registrations
for insert
with check (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "registrations_self_update"
on public.event_registrations
for update
using (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
)
with check (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "tasks_assignee_or_staff_read"
on public.tasks
for select
using (
  assigned_to = public.current_profile_id()
  or created_by = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "tasks_assignee_or_staff_update"
on public.tasks
for update
using (
  assigned_to = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
)
with check (
  assigned_to = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "checkins_self_or_staff_read"
on public.checkins
for select
using (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "channel_members_self_or_staff_read"
on public.channel_members
for select
using (
  user_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "messages_member_or_staff_read"
on public.messages
for select
using (
  sender_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

create policy "messages_member_create"
on public.messages
for insert
with check (
  sender_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);
