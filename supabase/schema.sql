-- Enxofre Craft: schema inicial.
-- Execute no SQL Editor do Supabase. Nunca coloque a service_role key no navegador.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Enxofre Craft',
  accent_color text not null default '#8b45c6',
  background_color text not null default '#120d18',
  banner_title text not null default 'SUA JORNADA COMEÇA AQUI.',
  banner_subtitle text not null default 'Encontre os melhores kits para sua aventura.',
  banner_image_url text not null default '',
  discord_url text not null default '',
  pix_key text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null default '',
  items jsonb not null,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','entregue','cancelado')),
  created_at timestamptz not null default now()
);


-- Valida os itens e recalcula o total no banco; não confia no preço enviado pelo navegador.
create or replace function public.validate_order_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  qty integer;
  calculated_total numeric(10,2) := 0;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Carrinho vazio ou inválido';
  end if;

  for item in select * from jsonb_array_elements(new.items)
  loop
    select * into product_row
      from public.products
      where id = (item->>'id')::uuid and active = true;

    if not found then
      raise exception 'Produto indisponível';
    end if;

    qty := (item->>'quantity')::integer;
    if qty < 1 or qty > 50 then
      raise exception 'Quantidade inválida';
    end if;

    calculated_total := calculated_total + (product_row.price * qty);
  end loop;

  new.total := calculated_total;
  return new;
end;
$$;

drop trigger if exists validate_order_before_insert on public.orders;
create trigger validate_order_before_insert
before insert on public.orders
for each row execute function public.validate_order_items();

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;

-- Função is_admin() é usada nas políticas para evitar confiar no navegador.
drop policy if exists "admins can read admin list" on public.admin_users;
create policy "admins can read admin list" on public.admin_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "products are public to read" on public.products;
create policy "products are public to read" on public.products
  for select to anon, authenticated using (active = true or public.is_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings are public to read" on public.store_settings;
create policy "settings are public to read" on public.store_settings
  for select to anon, authenticated using (true);

drop policy if exists "admins update settings" on public.store_settings;
create policy "admins update settings" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers create own orders" on public.orders;
create policy "customers create own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "customers and admins read orders" on public.orders;
create policy "customers and admins read orders" on public.orders
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ative Realtime para produtos/settings se desejar atualizações instantâneas:
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.store_settings;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

-- Depois de fazer o primeiro login Google, descubra seu UUID em Authentication > Users
-- e execute: insert into public.admin_users (user_id) values ('SEU-UUID-AQUI');
