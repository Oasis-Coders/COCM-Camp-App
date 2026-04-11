alter table public.inventory_movements
add column if not exists item_name text;

alter table public.inventory_movements
add column if not exists item_sku text;

alter table public.inventory_movements
drop constraint if exists inventory_movements_type_check;

alter table public.inventory_movements
add constraint inventory_movements_type_check
check (type in ('in', 'out', 'delete'));

alter table public.inventory_movements
drop constraint if exists inventory_movements_quantity_check;

alter table public.inventory_movements
add constraint inventory_movements_quantity_check
check (quantity >= 0);

alter table public.inventory_movements
drop constraint if exists inventory_movements_item_id_fkey;

alter table public.inventory_movements
alter column item_id drop not null;

alter table public.inventory_movements
add constraint inventory_movements_item_id_fkey
foreign key (item_id)
references public.inventory_items(id)
on delete set null;
