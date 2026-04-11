drop function if exists public.apply_inventory_transaction(
  text,
  uuid,
  numeric,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  timestamptz
);

drop table if exists public.inventory_transaction_lines cascade;
drop table if exists public.inventory_transactions cascade;
drop table if exists public.inventory_assignments cascade;
drop table if exists public.inventory_stock_levels cascade;
drop table if exists public.inventory_locations cascade;
drop table if exists public.inventory_items cascade;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique
);

create table if not exists public.inventory_stock (
  item_id uuid primary key references public.inventory_items(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.inventory_items(id) on delete set null,
  item_name text,
  item_sku text,
  type text not null check (type in ('in', 'out', 'delete')),
  quantity integer not null check (quantity >= 0),
  operator_name text not null,
  time timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_movements_time_idx
on public.inventory_movements (time desc);

create index if not exists inventory_movements_item_idx
on public.inventory_movements (item_id);

alter table public.inventory_items enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_movements enable row level security;

create policy "inventory_items_staff_read"
on public.inventory_items
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_stock_staff_read"
on public.inventory_stock
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create policy "inventory_movements_staff_read"
on public.inventory_movements
for select
using (public.has_any_role(array['super_admin', 'admin', 'staff']));

create or replace function public.inventory_add_item(
  p_name text,
  p_sku text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_item_id uuid;
begin
  if not public.has_any_role(array['super_admin', 'admin', 'staff']) then
    raise exception 'Inventory access denied';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Item name is required';
  end if;

  if p_sku is null or btrim(p_sku) = '' then
    raise exception 'SKU is required';
  end if;

  insert into public.inventory_items (name, sku)
  values (btrim(p_name), upper(btrim(p_sku)))
  returning id into new_item_id;

  insert into public.inventory_stock (item_id, quantity)
  values (new_item_id, 0);

  return new_item_id;
end;
$$;

create or replace function public.inventory_apply_movement(
  p_item_id uuid,
  p_type text,
  p_quantity integer,
  p_operator_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_quantity integer;
begin
  if not public.has_any_role(array['super_admin', 'admin', 'staff']) then
    raise exception 'Inventory access denied';
  end if;

  if p_item_id is null then
    raise exception 'Item is required';
  end if;

  if p_type not in ('in', 'out') then
    raise exception 'Movement type is invalid';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if p_operator_name is null or btrim(p_operator_name) = '' then
    raise exception 'Operator is required';
  end if;

  select quantity
  into current_quantity
  from public.inventory_stock
  where item_id = p_item_id
  for update;

  if not found then
    raise exception 'Inventory item not found';
  end if;

  if p_type = 'out' and current_quantity < p_quantity then
    raise exception 'Not enough stock';
  end if;

  update public.inventory_stock
  set quantity =
    case
      when p_type = 'in' then quantity + p_quantity
      else quantity - p_quantity
    end
  where item_id = p_item_id;

  insert into public.inventory_movements (item_id, type, quantity, operator_name)
  values (p_item_id, p_type, p_quantity, btrim(p_operator_name));
end;
$$;
