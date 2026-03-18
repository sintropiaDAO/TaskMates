create or replace function public.sync_product_stock_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'delivered' then
    return new;
  end if;

  if coalesce(new.quantity, 0) <= 0 then
    new.status := 'unavailable';
  elsif tg_op = 'INSERT' or old.status = 'unavailable' then
    new.status := 'available';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_product_stock_status_trigger on public.products;
create trigger sync_product_stock_status_trigger
before insert or update of quantity, status on public.products
for each row
execute function public.sync_product_stock_status();

create or replace function public.add_product_participation(
  _product_id uuid,
  _role text,
  _quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product public.products%rowtype;
  v_participant_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if _quantity is null or _quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if _role not in ('supplier', 'requester') then
    raise exception 'Invalid participant role';
  end if;

  select *
  into v_product
  from public.products
  where id = _product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_product.created_by = v_user_id then
    raise exception 'Owners cannot join their own product';
  end if;

  if v_product.status = 'delivered' then
    raise exception 'Product already delivered';
  end if;

  if coalesce(v_product.quantity, 0) < _quantity then
    raise exception 'Insufficient stock';
  end if;

  select id
  into v_participant_id
  from public.product_participants
  where product_id = _product_id
    and user_id = v_user_id
    and role = _role
  for update;

  if found then
    update public.product_participants
    set quantity = quantity + _quantity
    where id = v_participant_id;
  else
    insert into public.product_participants (
      product_id,
      user_id,
      role,
      quantity,
      status
    )
    values (
      _product_id,
      v_user_id,
      _role,
      _quantity,
      'confirmed'
    )
    returning id into v_participant_id;
  end if;

  update public.products
  set quantity = quantity - _quantity
  where id = _product_id;

  return v_participant_id;
end;
$$;

grant execute on function public.add_product_participation(uuid, text, integer) to authenticated;