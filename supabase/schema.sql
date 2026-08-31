-- =========================================================
-- ANGEL FORTES
-- DATABASE SCHEMA
-- =========================================================


create extension
if not exists pgcrypto;


create extension
if not exists btree_gist;



-- =========================================================
-- CUSTOMERS
-- =========================================================

create table
if not exists public.customers (

  id uuid
    primary key
    default gen_random_uuid(),

  name text
    not null,

  email text,

  phone text,

  created_at timestamptz
    not null
    default now()

);



-- =========================================================
-- SERVICES
-- =========================================================

create table
if not exists public.services (

  id uuid
    primary key
    default gen_random_uuid(),

  name text
    not null,

  price numeric(10,2)
    not null,

  duration_minutes integer
    not null,

  active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now()

);



-- =========================================================
-- APPOINTMENTS
-- =========================================================

create table
if not exists public.appointments (

  id uuid
    primary key
    default gen_random_uuid(),


  customer_id uuid
    references
      public.customers(id)
    on delete set null,


  service_id uuid
    references
      public.services(id)
    on delete set null,


  -- Snapshot do cliente

  name text,

  email text,

  phone text,


  -- Snapshot do serviço

  service text,

  price numeric(10,2),

  duration integer,


  -- Data / hora

  appointment_date date
    not null,

  appointment_time time
    not null,


  status text
    not null
    default 'confirmed'

    check (
      status in (
        'pending',
        'confirmed',
        'completed',
        'cancelled',
        'no_show'
      )
    ),


  notes text,


  marketing_consent boolean
    not null
    default false,


  followup_sent_at timestamptz,


  followup_opt_out boolean
    not null
    default false,


  created_at timestamptz
    not null
    default now()

);



-- =========================================================
-- MIGRAÇÃO PARA TABELAS APPOINTMENTS JÁ EXISTENTES
-- =========================================================

alter table
public.appointments

add column
if not exists name text;


alter table
public.appointments

add column
if not exists email text;


alter table
public.appointments

add column
if not exists phone text;


alter table
public.appointments

add column
if not exists service text;


alter table
public.appointments

add column
if not exists price numeric(10,2);


alter table
public.appointments

add column
if not exists duration integer;


alter table
public.appointments

add column
if not exists marketing_consent boolean
default false;


alter table
public.appointments

add column
if not exists followup_sent_at timestamptz;


alter table
public.appointments

add column
if not exists followup_opt_out boolean
default false;



-- =========================================================
-- REMOVER UNIQUE ANTIGO
--
-- Não queremos bloquear uma nova marcação apenas
-- porque uma marcação anterior no mesmo horário
-- foi cancelada.
-- =========================================================

alter table
public.appointments

drop constraint
if exists
appointments_appointment_date_appointment_time_key;



-- =========================================================
-- PROTEÇÃO CONTRA OVERLAP
--
-- Exemplo:
--
-- reserva existente
-- 10:00 → 10:20
--
-- nova reserva
-- 10:10 → 10:30
--
-- PostgreSQL bloqueia automaticamente.
-- =========================================================

do $$

begin

  if not exists (

    select 1

    from pg_constraint

    where conname =
      'appointments_no_overlap'

  ) then

    alter table
    public.appointments

    add constraint
    appointments_no_overlap

    exclude using gist (

      appointment_date
        with =,

      (
        int4range(

          (
            extract(
              hour
              from appointment_time
            )::integer * 60
          )
          +
          extract(
            minute
            from appointment_time
          )::integer,

          (
            extract(
              hour
              from appointment_time
            )::integer * 60
          )
          +
          extract(
            minute
            from appointment_time
          )::integer
          +
          duration,

          '[)'

        )
      )

      with &&

    )

    where (
      status <> 'cancelled'
      and duration is not null
    );

  end if;

end $$;



-- =========================================================
-- INDEX
-- =========================================================

create index
if not exists
appointments_date_index

on public.appointments (
  appointment_date
);



-- =========================================================
-- PRODUCTS
-- =========================================================

create table
if not exists public.products (

  id uuid
    primary key
    default gen_random_uuid(),

  name text
    not null,

  description text,

  price numeric(10,2)
    not null,

  stock integer
    not null
    default 0,

  image_url text,

  active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now()

);



-- =========================================================
-- ORDERS
-- =========================================================

create table
if not exists public.orders (

  id uuid
    primary key
    default gen_random_uuid(),

  customer_id uuid
    references
      public.customers(id)
    on delete set null,

  status text
    not null
    default 'pending'

    check (
      status in (
        'pending',
        'paid',
        'cancelled',
        'refunded'
      )
    ),

  total numeric(10,2)
    not null
    default 0,

  payment_reference text,

  created_at timestamptz
    not null
    default now()

);



-- =========================================================
-- ORDER ITEMS
-- =========================================================

create table
if not exists public.order_items (

  id uuid
    primary key
    default gen_random_uuid(),

  order_id uuid
    not null

    references
      public.orders(id)

    on delete cascade,


  product_id uuid

    references
      public.products(id)

    on delete set null,


  quantity integer
    not null

    check (
      quantity > 0
    ),


  unit_price numeric(10,2)
    not null

);



-- =========================================================
-- CONTACT MESSAGES
-- =========================================================

create table
if not exists public.contact_messages (

  id uuid
    primary key
    default gen_random_uuid(),

  name text
    not null,

  email text
    not null,

  phone text,

  message text
    not null,

  created_at timestamptz
    not null
    default now()

);