-- ============================================================
-- TUDO DE COMPRAS — SUPABASE SETUP / MIGRATION
-- Executar no SQL Editor do Supabase.
-- Seguro para um projeto novo ou para o schema antigo do site.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Campos necessários pela nova loja.
alter table public.products
  add column if not exists slug text,
  add column if not exists category text not null default 'Outros',
  add column if not exists featured boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Se já existirem produtos do schema anterior, gera slugs técnicos únicos.
update public.products
set slug = 'produto-' || id::text
where slug is null or btrim(slug) = '';

alter table public.products
  alter column slug set not null;

create unique index if not exists products_slug_unique_idx
  on public.products(slug);

create index if not exists products_active_idx
  on public.products(active);

create index if not exists products_featured_idx
  on public.products(featured);

create index if not exists products_category_idx
  on public.products(category);

-- RLS / ADMIN AUTHORIZATION
-- A tabela de administradores não fica exposta à API pública.
create table if not exists public.store_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.store_admins enable row level security;

revoke all on table public.store_admins from anon, authenticated;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;

alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon
using (active = true);

drop policy if exists "Store admins can read all products" on public.products;
create policy "Store admins can read all products"
on public.products
for select
to authenticated
using (public.is_store_admin());

drop policy if exists "Store admins can insert products" on public.products;
create policy "Store admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_store_admin());

drop policy if exists "Store admins can update products" on public.products;
create policy "Store admins can update products"
on public.products
for update
to authenticated
using (public.is_store_admin())
with check (public.is_store_admin());

drop policy if exists "Store admins can delete products" on public.products;
create policy "Store admins can delete products"
on public.products
for delete
to authenticated
using (public.is_store_admin());

-- Storage para fotografias dos produtos.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Store admins can upload product images" on storage.objects;
create policy "Store admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_store_admin()
);

drop policy if exists "Store admins can update product images" on storage.objects;
create policy "Store admins can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_store_admin()
)
with check (
  bucket_id = 'product-images'
  and public.is_store_admin()
);

drop policy if exists "Store admins can delete product images" on storage.objects;
create policy "Store admins can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_store_admin()
);

-- Produtos de exemplo opcionais.
insert into public.products (
  slug,
  name,
  description,
  price,
  stock,
  category,
  active,
  featured
)
values
  (
    'pomada-matte',
    'Pomada Matte',
    'Fixação média com acabamento natural e sem brilho.',
    12.90,
    8,
    'Cabelo',
    true,
    true
  ),
  (
    'oleo-de-barba',
    'Óleo de Barba',
    'Hidratação diária, toque suave e fragrância discreta.',
    14.50,
    5,
    'Barba',
    true,
    true
  ),
  (
    'sea-salt-spray',
    'Sea Salt Spray',
    'Textura, volume e acabamento seco para styling diário.',
    13.90,
    12,
    'Styling',
    true,
    true
  )
on conflict (slug) do nothing;

-- ============================================================
-- CHECKOUT / STRIPE — ENCOMENDAS E RESERVA DE STOCK
-- ============================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  currency text not null default 'eur',
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  customer_email text,
  customer_name text,
  customer_phone text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Sem policies públicas: só o backend com service role acede às encomendas.
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;

-- Reserva o stock antes de enviar o cliente para o Stripe Checkout.
create or replace function public.reserve_store_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_item record;
  v_stock integer;
begin
  select status
  into v_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Encomenda não encontrada.';
  end if;

  if v_status = 'reserved' then
    return false;
  end if;

  if v_status <> 'pending' then
    raise exception 'A encomenda não pode ser reservada no estado %.', v_status;
  end if;

  -- Primeiro valida e bloqueia todas as linhas de produto.
  for v_item in
    select product_id, quantity, product_name
    from public.order_items
    where order_id = p_order_id
    order by product_id
  loop
    select stock
    into v_stock
    from public.products
    where id = v_item.product_id
      and active = true
    for update;

    if not found then
      raise exception 'Produto indisponível: %.', v_item.product_name;
    end if;

    if v_stock < v_item.quantity then
      raise exception 'Stock insuficiente para %.', v_item.product_name;
    end if;
  end loop;

  -- Depois desconta stock dentro da mesma transação.
  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.products
    set stock = stock - v_item.quantity,
        updated_at = now()
    where id = v_item.product_id;
  end loop;

  update public.orders
  set status = 'reserved',
      updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

-- Liberta stock quando o Checkout expira, falha ou nem chega a ser criado.
create or replace function public.release_store_order(
  p_order_id uuid,
  p_status text default 'expired'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_item record;
begin
  select status
  into v_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_status <> 'reserved' then
    return false;
  end if;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.products
    set stock = stock + v_item.quantity,
        updated_at = now()
    where id = v_item.product_id;
  end loop;

  update public.orders
  set status = coalesce(nullif(btrim(p_status), ''), 'expired'),
      updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

-- Torna a encomenda paga. Idempotente: repetir o webhook não duplica alterações.
create or replace function public.finalize_store_order(
  p_order_id uuid,
  p_stripe_session_id text,
  p_payment_intent_id text,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_total numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status
  into v_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Encomenda não encontrada.';
  end if;

  if v_status = 'paid' then
    return false;
  end if;

  if v_status <> 'reserved' then
    raise exception 'A encomenda não está reservada (estado: %).', v_status;
  end if;

  update public.orders
  set status = 'paid',
      stripe_session_id = p_stripe_session_id,
      stripe_payment_intent_id = p_payment_intent_id,
      customer_email = p_customer_email,
      customer_name = p_customer_name,
      customer_phone = p_customer_phone,
      shipping_address = p_shipping_address,
      total = coalesce(p_total, total),
      paid_at = now(),
      updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.reserve_store_order(uuid) from public;
revoke all on function public.release_store_order(uuid, text) from public;
revoke all on function public.finalize_store_order(uuid, text, text, text, text, text, jsonb, numeric) from public;

grant execute on function public.reserve_store_order(uuid) to service_role;
grant execute on function public.release_store_order(uuid, text) to service_role;
grant execute on function public.finalize_store_order(uuid, text, text, text, text, text, jsonb, numeric) to service_role;
