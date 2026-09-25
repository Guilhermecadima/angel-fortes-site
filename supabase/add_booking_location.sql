-- Executa uma vez no SQL Editor do Supabase.
-- As marcações antigas ficam associadas a Santa Marta.

alter table public.appointments
add column if not exists location text default 'santa_marta';

update public.appointments
set location = 'santa_marta'
where location is null;

alter table public.appointments
alter column location set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_location_check'
  ) then
    alter table public.appointments
    add constraint appointments_location_check
    check (location in ('santa_marta', 'costa_caparica'));
  end if;
end $$;
