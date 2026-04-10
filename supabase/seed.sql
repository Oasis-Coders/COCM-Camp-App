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
  ('Prepare arrival QR poster', 'Print and laminate the entrance QR poster.', 'open', 'medium', '77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-05-12T09:00:00Z'),
  ('Order dietary-label stickers', 'Source and order stickers for meal trays. Waiting on supplier quote.', 'draft', 'low', '77777777-7777-7777-7777-777777777777', null, '22222222-2222-2222-2222-222222222222', '2026-05-08T17:00:00Z'),
  ('Brief volunteer team leads', 'Run a 30-min orientation for volunteer leads before the event.', 'open', 'high', '77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '2026-05-14T10:00:00Z'),
  ('Post-event feedback survey', 'Draft and schedule the post-camp feedback form.', 'draft', 'medium', '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2026-05-20T12:00:00Z'),
  ('Emergency kit audit', 'Verify first-aid supplies are stocked and expiry dates are valid. Blocked — waiting on supply delivery.', 'blocked', 'urgent', '77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-05-13T08:00:00Z');

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

insert into public.inventory_locations (
  id,
  name,
  code,
  location_type,
  event_id,
  created_by
)
values
  ('90000000-0000-0000-0000-000000000001', 'Main Storage', 'MAIN', 'storage', null, '22222222-2222-2222-2222-222222222222'),
  ('90000000-0000-0000-0000-000000000002', 'Welcome Desk', 'DESK', 'room', null, '22222222-2222-2222-2222-222222222222'),
  ('90000000-0000-0000-0000-000000000003', 'Van 1', 'VAN1', 'vehicle', null, '22222222-2222-2222-2222-222222222222'),
  ('90000000-0000-0000-0000-000000000004', 'Spring Weekend Staging', 'STAGE', 'event', '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.inventory_items (
  id,
  sku,
  name,
  description,
  category,
  unit,
  minimum_stock,
  is_checkoutable,
  default_location_id,
  created_by
)
values
  ('91000000-0000-0000-0000-000000000001', 'WATER-001', 'Bottled Water', 'Cases of bottled water for registration and staging areas.', 'Hospitality', 'case', 20, false, '90000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
  ('91000000-0000-0000-0000-000000000002', 'RADIO-001', 'Walkie Talkie', 'Reusable communication radios for staff operations.', 'Comms', 'each', 2, true, '90000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
  ('91000000-0000-0000-0000-000000000003', 'KIT-001', 'Welcome Kits', 'Prepared welcome packs for arriving participants.', 'Registration', 'kit', 15, false, '90000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),
  ('91000000-0000-0000-0000-000000000004', 'CORD-001', 'Extension Cord', 'Heavy-duty extension cords for event setup.', 'Facilities', 'each', 2, true, '90000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.inventory_stock_levels (
  id,
  item_id,
  location_id,
  quantity_on_hand,
  minimum_stock_override
)
values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 48, null),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000004', 12, 15),
  ('92000000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 4, null),
  ('92000000-0000-0000-0000-000000000004', '91000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000002', 20, null),
  ('92000000-0000-0000-0000-000000000005', '91000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', 6, null)
on conflict (id) do nothing;

insert into public.inventory_assignments (
  id,
  item_id,
  source_location_id,
  assigned_to_profile_id,
  assigned_to_event_id,
  quantity,
  status,
  due_back_at,
  created_by,
  notes
)
values
  ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', null, 1, 'active', '2026-05-17T18:00:00Z', '22222222-2222-2222-2222-222222222222', 'Radio assigned to the check-in lead.'),
  ('93000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', null, '77777777-7777-7777-7777-777777777777', 2, 'active', '2026-05-17T20:00:00Z', '22222222-2222-2222-2222-222222222222', 'Extension cords staged for the retreat venue.')
on conflict (id) do nothing;

insert into public.inventory_transactions (
  id,
  transaction_type,
  actor_profile_id,
  source_location_id,
  destination_location_id,
  related_profile_id,
  related_event_id,
  assignment_id,
  reason_code,
  notes,
  created_at
)
values
  ('94000000-0000-0000-0000-000000000001', 'receive', '22222222-2222-2222-2222-222222222222', null, '90000000-0000-0000-0000-000000000001', null, null, null, 'initial-stock', 'Initial beverage stock loaded into main storage.', '2026-04-06T09:00:00Z'),
  ('94000000-0000-0000-0000-000000000002', 'transfer', '22222222-2222-2222-2222-222222222222', '90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000004', null, '77777777-7777-7777-7777-777777777777', null, 'event-prep', 'Moved water to the retreat staging area.', '2026-04-07T15:30:00Z'),
  ('94000000-0000-0000-0000-000000000003', 'receive', '22222222-2222-2222-2222-222222222222', null, '90000000-0000-0000-0000-000000000001', null, null, null, 'initial-stock', 'Initial radio stock loaded for staff operations.', '2026-04-06T11:00:00Z'),
  ('94000000-0000-0000-0000-000000000004', 'checkout', '22222222-2222-2222-2222-222222222222', '90000000-0000-0000-0000-000000000001', null, '33333333-3333-3333-3333-333333333333', null, '93000000-0000-0000-0000-000000000001', 'event-ops', 'Checked out to the check-in lead.', '2026-04-08T08:00:00Z'),
  ('94000000-0000-0000-0000-000000000005', 'receive', '22222222-2222-2222-2222-222222222222', null, '90000000-0000-0000-0000-000000000002', null, null, null, 'initial-stock', 'Prepared welcome kits at the front desk.', '2026-04-05T13:00:00Z'),
  ('94000000-0000-0000-0000-000000000006', 'adjustment', '22222222-2222-2222-2222-222222222222', '90000000-0000-0000-0000-000000000002', null, null, null, null, 'count-correction', 'Added missing kits after a physical count.', '2026-04-08T17:20:00Z'),
  ('94000000-0000-0000-0000-000000000007', 'receive', '22222222-2222-2222-2222-222222222222', null, '90000000-0000-0000-0000-000000000001', null, null, null, 'initial-stock', 'Initial facilities stock loaded into main storage.', '2026-04-06T12:30:00Z'),
  ('94000000-0000-0000-0000-000000000008', 'checkout', '22222222-2222-2222-2222-222222222222', '90000000-0000-0000-0000-000000000001', null, null, '77777777-7777-7777-7777-777777777777', '93000000-0000-0000-0000-000000000002', 'event-setup', 'Checked out extension cords for event staging.', '2026-04-08T18:10:00Z')
on conflict (id) do nothing;

insert into public.inventory_transaction_lines (
  id,
  transaction_id,
  item_id,
  quantity
)
values
  ('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 60),
  ('95000000-0000-0000-0000-000000000002', '94000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 12),
  ('95000000-0000-0000-0000-000000000003', '94000000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000002', 5),
  ('95000000-0000-0000-0000-000000000004', '94000000-0000-0000-0000-000000000004', '91000000-0000-0000-0000-000000000002', 1),
  ('95000000-0000-0000-0000-000000000005', '94000000-0000-0000-0000-000000000005', '91000000-0000-0000-0000-000000000003', 15),
  ('95000000-0000-0000-0000-000000000006', '94000000-0000-0000-0000-000000000006', '91000000-0000-0000-0000-000000000003', 5),
  ('95000000-0000-0000-0000-000000000007', '94000000-0000-0000-0000-000000000007', '91000000-0000-0000-0000-000000000004', 8),
  ('95000000-0000-0000-0000-000000000008', '94000000-0000-0000-0000-000000000008', '91000000-0000-0000-0000-000000000004', 2)
on conflict (id) do nothing;
