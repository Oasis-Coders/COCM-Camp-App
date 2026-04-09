create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  location_type text not null
    check (location_type in ('storage', 'event', 'vehicle', 'room', 'temporary')),
  event_id uuid references public.events(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text not null,
  unit text not null default 'each',
  minimum_stock numeric(12,2) not null default 0 check (minimum_stock >= 0),
  is_checkoutable boolean not null default true,
  default_location_id uuid references public.inventory_locations(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_stock_levels (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  quantity_on_hand numeric(12,2) not null default 0 check (quantity_on_hand >= 0),
  minimum_stock_override numeric(12,2) check (minimum_stock_override is null or minimum_stock_override >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (item_id, location_id)
);

create table if not exists public.inventory_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  source_location_id uuid references public.inventory_locations(id) on delete set null,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  assigned_to_event_id uuid references public.events(id) on delete set null,
  quantity numeric(12,2) not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'returned', 'cancelled')),
  due_back_at timestamptz,
  returned_at timestamptz,
  returned_to_location_id uuid references public.inventory_locations(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(assigned_to_profile_id, assigned_to_event_id) = 1)
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null
    check (transaction_type in ('receive', 'transfer', 'checkout', 'return', 'adjustment')),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  source_location_id uuid references public.inventory_locations(id) on delete set null,
  destination_location_id uuid references public.inventory_locations(id) on delete set null,
  related_profile_id uuid references public.profiles(id) on delete set null,
  related_event_id uuid references public.events(id) on delete set null,
  assignment_id uuid references public.inventory_assignments(id) on delete set null,
  reason_code text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.inventory_transactions(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity <> 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_stock_levels_location_idx
on public.inventory_stock_levels (location_id);

create index if not exists inventory_stock_levels_item_idx
on public.inventory_stock_levels (item_id);

create index if not exists inventory_assignments_active_idx
on public.inventory_assignments (status, returned_at);

create index if not exists inventory_transactions_created_at_idx
on public.inventory_transactions (created_at desc);

create trigger set_inventory_locations_updated_at
before update on public.inventory_locations
for each row execute function public.set_updated_at();

create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

create trigger set_inventory_stock_levels_updated_at
before update on public.inventory_stock_levels
for each row execute function public.set_updated_at();

create trigger set_inventory_assignments_updated_at
before update on public.inventory_assignments
for each row execute function public.set_updated_at();

alter table public.inventory_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_stock_levels enable row level security;
alter table public.inventory_assignments enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.inventory_transaction_lines enable row level security;

create policy "inventory_locations_staff_read"
on public.inventory_locations
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_locations_staff_insert"
on public.inventory_locations
for insert
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_locations_staff_update"
on public.inventory_locations
for update
using (public.has_any_role(array['super_admin', 'admin', 'staff']))
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_items_staff_read"
on public.inventory_items
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_items_staff_insert"
on public.inventory_items
for insert
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_items_staff_update"
on public.inventory_items
for update
using (public.has_any_role(array['super_admin', 'admin', 'staff']))
with check (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_stock_levels_staff_read"
on public.inventory_stock_levels
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_assignments_staff_read"
on public.inventory_assignments
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_transactions_staff_read"
on public.inventory_transactions
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_transaction_lines_staff_read"
on public.inventory_transaction_lines
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create or replace function public.apply_inventory_transaction(
  p_transaction_type text,
  p_item_id uuid default null,
  p_quantity numeric default null,
  p_source_location_id uuid default null,
  p_destination_location_id uuid default null,
  p_reason_code text default null,
  p_notes text default null,
  p_assigned_to_profile_id uuid default null,
  p_assigned_to_event_id uuid default null,
  p_assignment_id uuid default null,
  p_due_back_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile_id uuid;
  checkoutable boolean;
  assignment_record public.inventory_assignments%rowtype;
  transaction_id uuid;
  transaction_item_id uuid;
  effective_destination_location_id uuid;
begin
  actor_profile_id := public.current_profile_id();

  if actor_profile_id is null
    or not public.has_any_role(array['super_admin', 'admin', 'staff']) then
    raise exception 'Inventory access denied';
  end if;

  if p_reason_code is null or btrim(p_reason_code) = '' then
    raise exception 'Inventory reason code is required';
  end if;

  if p_transaction_type not in ('receive', 'transfer', 'checkout', 'return', 'adjustment') then
    raise exception 'Inventory transaction type is invalid';
  end if;

  if p_transaction_type <> 'return' then
    if p_item_id is null then
      raise exception 'Inventory item is required';
    end if;

    select is_checkoutable
    into checkoutable
    from public.inventory_items
    where id = p_item_id and is_active = true;

    if not found then
      raise exception 'Inventory item not found';
    end if;
  end if;

  if p_transaction_type = 'receive' then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'Receive quantity must be greater than zero';
    end if;

    if p_destination_location_id is null then
      raise exception 'Receive destination is required';
    end if;

    insert into public.inventory_transactions (
      transaction_type,
      actor_profile_id,
      destination_location_id,
      reason_code,
      notes
    )
    values (
      p_transaction_type,
      actor_profile_id,
      p_destination_location_id,
      btrim(p_reason_code),
      nullif(btrim(p_notes), '')
    )
    returning id into transaction_id;

    insert into public.inventory_transaction_lines (transaction_id, item_id, quantity)
    values (transaction_id, p_item_id, p_quantity);

    insert into public.inventory_stock_levels (item_id, location_id, quantity_on_hand)
    values (p_item_id, p_destination_location_id, p_quantity)
    on conflict (item_id, location_id) do update
    set
      quantity_on_hand = public.inventory_stock_levels.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = timezone('utc', now());

    return transaction_id;
  end if;

  if p_transaction_type = 'transfer' then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'Transfer quantity must be greater than zero';
    end if;

    if p_source_location_id is null or p_destination_location_id is null then
      raise exception 'Transfer source and destination are required';
    end if;

    if p_source_location_id = p_destination_location_id then
      raise exception 'Transfer source and destination must differ';
    end if;

    update public.inventory_stock_levels
    set
      quantity_on_hand = quantity_on_hand - p_quantity,
      updated_at = timezone('utc', now())
    where item_id = p_item_id
      and location_id = p_source_location_id
      and quantity_on_hand >= p_quantity;

    if not found then
      raise exception 'Not enough stock to transfer';
    end if;

    insert into public.inventory_transactions (
      transaction_type,
      actor_profile_id,
      source_location_id,
      destination_location_id,
      reason_code,
      notes
    )
    values (
      p_transaction_type,
      actor_profile_id,
      p_source_location_id,
      p_destination_location_id,
      btrim(p_reason_code),
      nullif(btrim(p_notes), '')
    )
    returning id into transaction_id;

    insert into public.inventory_transaction_lines (transaction_id, item_id, quantity)
    values (transaction_id, p_item_id, p_quantity);

    insert into public.inventory_stock_levels (item_id, location_id, quantity_on_hand)
    values (p_item_id, p_destination_location_id, p_quantity)
    on conflict (item_id, location_id) do update
    set
      quantity_on_hand = public.inventory_stock_levels.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = timezone('utc', now());

    return transaction_id;
  end if;

  if p_transaction_type = 'checkout' then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'Checkout quantity must be greater than zero';
    end if;

    if p_source_location_id is null then
      raise exception 'Checkout source location is required';
    end if;

    if not checkoutable then
      raise exception 'Item is not checkoutable';
    end if;

    if num_nonnulls(p_assigned_to_profile_id, p_assigned_to_event_id) <> 1 then
      raise exception 'Checkout requires exactly one assignee';
    end if;

    update public.inventory_stock_levels
    set
      quantity_on_hand = quantity_on_hand - p_quantity,
      updated_at = timezone('utc', now())
    where item_id = p_item_id
      and location_id = p_source_location_id
      and quantity_on_hand >= p_quantity;

    if not found then
      raise exception 'Not enough stock to check out';
    end if;

    insert into public.inventory_assignments (
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
    values (
      p_item_id,
      p_source_location_id,
      p_assigned_to_profile_id,
      p_assigned_to_event_id,
      p_quantity,
      'active',
      p_due_back_at,
      actor_profile_id,
      nullif(btrim(p_notes), '')
    )
    returning * into assignment_record;

    insert into public.inventory_transactions (
      transaction_type,
      actor_profile_id,
      source_location_id,
      related_profile_id,
      related_event_id,
      assignment_id,
      reason_code,
      notes
    )
    values (
      p_transaction_type,
      actor_profile_id,
      p_source_location_id,
      p_assigned_to_profile_id,
      p_assigned_to_event_id,
      assignment_record.id,
      btrim(p_reason_code),
      nullif(btrim(p_notes), '')
    )
    returning id into transaction_id;

    insert into public.inventory_transaction_lines (transaction_id, item_id, quantity)
    values (transaction_id, p_item_id, p_quantity);

    return transaction_id;
  end if;

  if p_transaction_type = 'return' then
    if p_assignment_id is null then
      raise exception 'Return assignment is required';
    end if;

    if p_destination_location_id is null then
      raise exception 'Return destination is required';
    end if;

    select *
    into assignment_record
    from public.inventory_assignments
    where id = p_assignment_id
      and status = 'active'
      and returned_at is null
    for update;

    if not found then
      raise exception 'Active assignment not found';
    end if;

    transaction_item_id := assignment_record.item_id;
    effective_destination_location_id := p_destination_location_id;

    update public.inventory_assignments
    set
      status = 'returned',
      returned_at = timezone('utc', now()),
      returned_to_location_id = effective_destination_location_id,
      closed_by = actor_profile_id,
      updated_at = timezone('utc', now())
    where id = assignment_record.id;

    insert into public.inventory_transactions (
      transaction_type,
      actor_profile_id,
      source_location_id,
      destination_location_id,
      related_profile_id,
      related_event_id,
      assignment_id,
      reason_code,
      notes
    )
    values (
      p_transaction_type,
      actor_profile_id,
      assignment_record.source_location_id,
      effective_destination_location_id,
      assignment_record.assigned_to_profile_id,
      assignment_record.assigned_to_event_id,
      assignment_record.id,
      btrim(p_reason_code),
      coalesce(nullif(btrim(p_notes), ''), assignment_record.notes)
    )
    returning id into transaction_id;

    insert into public.inventory_transaction_lines (transaction_id, item_id, quantity)
    values (transaction_id, transaction_item_id, assignment_record.quantity);

    insert into public.inventory_stock_levels (item_id, location_id, quantity_on_hand)
    values (transaction_item_id, effective_destination_location_id, assignment_record.quantity)
    on conflict (item_id, location_id) do update
    set
      quantity_on_hand = public.inventory_stock_levels.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = timezone('utc', now());

    return transaction_id;
  end if;

  if p_transaction_type = 'adjustment' then
    if p_quantity is null or p_quantity = 0 then
      raise exception 'Adjustment quantity must be non-zero';
    end if;

    if p_source_location_id is null then
      raise exception 'Adjustment location is required';
    end if;

    if p_quantity > 0 then
      insert into public.inventory_stock_levels (item_id, location_id, quantity_on_hand)
      values (p_item_id, p_source_location_id, p_quantity)
      on conflict (item_id, location_id) do update
      set
        quantity_on_hand = public.inventory_stock_levels.quantity_on_hand + excluded.quantity_on_hand,
        updated_at = timezone('utc', now());
    else
      update public.inventory_stock_levels
      set
        quantity_on_hand = quantity_on_hand + p_quantity,
        updated_at = timezone('utc', now())
      where item_id = p_item_id
        and location_id = p_source_location_id
        and quantity_on_hand >= abs(p_quantity);

      if not found then
        raise exception 'Adjustment would move stock below zero';
      end if;
    end if;

    insert into public.inventory_transactions (
      transaction_type,
      actor_profile_id,
      source_location_id,
      reason_code,
      notes
    )
    values (
      p_transaction_type,
      actor_profile_id,
      p_source_location_id,
      btrim(p_reason_code),
      nullif(btrim(p_notes), '')
    )
    returning id into transaction_id;

    insert into public.inventory_transaction_lines (transaction_id, item_id, quantity)
    values (transaction_id, p_item_id, p_quantity);

    return transaction_id;
  end if;

  raise exception 'Inventory transaction type is invalid';
end;
$$;
