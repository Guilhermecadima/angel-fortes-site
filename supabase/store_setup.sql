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
