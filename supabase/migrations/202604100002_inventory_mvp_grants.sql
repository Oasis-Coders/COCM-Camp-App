grant usage on schema public to authenticated, anon;

grant select on public.inventory_items to authenticated, anon;
grant select on public.inventory_stock to authenticated, anon;
grant select on public.inventory_movements to authenticated, anon;

grant execute on function public.inventory_add_item(text, text) to authenticated;
grant execute on function public.inventory_apply_movement(uuid, text, integer, text) to authenticated;
