-- Añadir tabla de zonas/plantas
create table public.zones (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Añadir zone_id a rooms
alter table public.rooms
  add column zone_id uuid references public.zones(id) on delete set null;

-- RLS para zones
alter table public.zones enable row level security;

create policy "Ver zonas del hogar"
  on public.zones for select
  using (household_id in (select public.my_household_ids()));

create policy "Gestionar zonas del hogar"
  on public.zones for all
  using (household_id in (select public.my_household_ids()));
