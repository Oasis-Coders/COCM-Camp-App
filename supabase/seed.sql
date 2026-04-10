insert into public.profiles (
  id,
  email,
  first_name,
  last_name,
  preferred_name,
  display_name
)
values
  ('11111111-1111-1111-1111-111111111111', 'super-admin@demo.local', 'Super', 'Admin', 'Super', 'Super Admin'),
  ('22222222-2222-2222-2222-222222222222', 'admin@demo.local', 'Camp', 'Admin', 'Admin', 'Admin'),
  ('33333333-3333-3333-3333-333333333333', 'staff@demo.local', 'Camp', 'Staff', 'Staff', 'Staff'),
  ('44444444-4444-4444-4444-444444444444', 'participant1@demo.local', 'Participant', 'One', 'P1', 'P1'),
  ('55555555-5555-5555-5555-555555555555', 'participant2@demo.local', 'Participant', 'Two', 'P2', 'P2'),
  ('66666666-6666-6666-6666-666666666666', 'participant3@demo.local', 'Participant', 'Three', 'P3', 'P3')
on conflict (id) do nothing;

insert into public.roles (id, name, description)
values
  ('a1111111-1111-1111-1111-111111111111', 'super_admin', 'Full system access'),
  ('a2222222-2222-2222-2222-222222222222', 'admin', 'Operational management access'),
  ('a3333333-3333-3333-3333-333333333333', 'staff', 'Execution and check-in access'),
  ('a4444444-4444-4444-4444-444444444444', 'participant', 'End-user event participation access')
on conflict (name) do nothing;

insert into public.user_roles (user_id, role_id)
values
  ('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444'),
  ('55555555-5555-5555-5555-555555555555', 'a4444444-4444-4444-4444-444444444444'),
  ('66666666-6666-6666-6666-666666666666', 'a4444444-4444-4444-4444-444444444444')
on conflict do nothing;

insert into public.events (
  id,
  title,
  slug,
  description,
  location,
  starts_at,
  ends_at,
  capacity,
  status,
  created_by
)
values (
  '77777777-7777-7777-7777-777777777777',
  'Spring Leadership Weekend',
  'spring-leadership-weekend',
  'Seeded sample event for testing signups and staff tools.',
  'Lakeview Retreat Center',
  '2026-05-15T17:00:00Z',
  '2026-05-17T14:00:00Z',
  120,
  'published',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;

insert into public.event_registrations (event_id, user_id, status, notes)
values
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'registered', 'Vegetarian meals'),
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'waitlisted', null)
on conflict (event_id, user_id) do nothing;

insert into public.tasks (title, description, status, priority, event_id, assigned_to, created_by, due_at)
values
  ('Finalize counselor roster', 'Confirm final staffing assignments.', 'in_progress', 'high', '77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-05-10T12:00:00Z'),
  ('Prepare arrival QR poster', 'Print and laminate the entrance QR poster.', 'todo', 'medium', '77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-05-12T09:00:00Z');

insert into public.checkin_codes (event_id, code, expires_at, created_by)
values
  ('77777777-7777-7777-7777-777777777777', 'SPRING-ARRIVAL', '2026-05-17T14:00:00Z', '33333333-3333-3333-3333-333333333333')
on conflict (code) do nothing;

insert into public.checkins (event_id, user_id, checked_in_by, method, notes)
values
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'manual', 'Arrived early for setup')
on conflict (event_id, user_id) do nothing;

insert into public.channels (id, event_id, name, visibility)
values
  ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 'Spring Weekend Staff', 'staff')
on conflict (id) do nothing;

insert into public.channel_members (channel_id, user_id)
values
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333'),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.messages (channel_id, sender_id, body)
values
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Check-in table opens at 4:30 PM.');

insert into public.inventory_items (
  id,
  name,
  sku
)
values
  ('91000000-0000-0000-0000-000000000001', 'Bottled Water', 'WATER-001'),
  ('91000000-0000-0000-0000-000000000002', 'Walkie Talkie', 'RADIO-001'),
  ('91000000-0000-0000-0000-000000000003', 'Welcome Kit', 'KIT-001'),
  ('91000000-0000-0000-0000-000000000004', 'Extension Cord', 'CORD-001')
on conflict (id) do nothing;

insert into public.inventory_stock (
  item_id,
  quantity
)
values
  ('91000000-0000-0000-0000-000000000001', 60),
  ('91000000-0000-0000-0000-000000000002', 4),
  ('91000000-0000-0000-0000-000000000003', 20),
  ('91000000-0000-0000-0000-000000000004', 6)
on conflict (item_id) do nothing;

insert into public.inventory_movements (
  id,
  item_id,
  type,
  quantity,
  operator_name,
  time
)
values
  ('94000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'in', 60, 'Admin', '2026-04-06T09:00:00Z'),
  ('94000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000002', 'in', 5, 'Admin', '2026-04-06T11:00:00Z'),
  ('94000000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000003', 'in', 20, 'Staff', '2026-04-05T13:00:00Z'),
  ('94000000-0000-0000-0000-000000000004', '91000000-0000-0000-0000-000000000004', 'in', 8, 'Admin', '2026-04-06T12:30:00Z'),
  ('94000000-0000-0000-0000-000000000005', '91000000-0000-0000-0000-000000000004', 'out', 2, 'Staff', '2026-04-08T18:10:00Z')
on conflict (id) do nothing;
