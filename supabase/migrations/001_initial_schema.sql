-- ============================================================
-- LOS PORTALES VILLAGE — Migración inicial
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Habilitar extensión uuid
create extension if not exists "uuid-ossp";

-- ============================================================
-- HOGARES
-- ============================================================
create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MIEMBROS DEL HOGAR
-- ============================================================
create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  unique (household_id, user_id)
);

-- ============================================================
-- INVITACIONES
-- ============================================================
create table public.invitations (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  email text not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- ============================================================
-- HABITACIONES
-- ============================================================
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  type text not null default 'other' check (type in (
    'bedroom', 'bathroom', 'kitchen', 'living_room', 'dining_room',
    'hallway', 'garage', 'terrace', 'garden', 'office', 'laundry', 'storage', 'other'
  )),
  floor_sqm numeric(8,2),
  ceiling_height_cm integer,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  color text default '#9B8E7E',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MEDIDAS (puertas, ventanas, paredes, etc.)
-- ============================================================
create table public.measurements (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  category text not null default 'other' check (category in (
    'door', 'window', 'wall', 'floor', 'ceiling', 'radiator', 'other'
  )),
  label text not null,
  width_cm numeric(8,1),
  height_cm numeric(8,1),
  depth_cm numeric(8,1),
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- FOTOS
-- ============================================================
create table public.photos (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade,
  task_id uuid, -- referencia añadida más abajo con ALTER TABLE
  storage_path text not null,
  caption text,
  taken_at timestamptz default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================
-- TAREAS
-- ============================================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  description text,
  category text default 'other' check (category in (
    'plumbing', 'electrical', 'painting', 'carpentry', 'flooring',
    'tiling', 'roofing', 'insulation', 'demolition', 'furniture',
    'appliances', 'cleaning', 'garden', 'other'
  )),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in (
    'pending', 'in_progress', 'done', 'blocked', 'cancelled'
  )),
  due_date date,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Añadir FK de fotos → tareas ahora que la tabla existe
alter table public.photos
  add constraint photos_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete set null;

-- ============================================================
-- GASTOS
-- ============================================================
create table public.expenses (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  amount numeric(10,2) not null,
  currency text default 'EUR',
  category text default 'other' check (category in (
    'materials', 'labor', 'appliances', 'furniture', 'tools',
    'permits', 'design', 'transport', 'other'
  )),
  description text not null,
  expense_date date not null default current_date,
  receipt_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Presupuesto total del hogar
create table public.household_budget (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null unique,
  total_budget numeric(12,2) default 0,
  notes text,
  updated_at timestamptz default now()
);

-- ============================================================
-- LISTA DE COMPRA
-- ============================================================
create table public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  name text not null,
  quantity numeric(8,2) default 1,
  unit text default 'ud',
  estimated_price numeric(10,2),
  actual_price numeric(10,2),
  store text,
  url text,
  notes text,
  purchased boolean default false,
  purchased_at timestamptz,
  purchased_by uuid references auth.users(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTRATISTAS / CONTACTOS
-- ============================================================
create table public.contractors (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  specialty text check (specialty in (
    'plumber', 'electrician', 'painter', 'carpenter', 'architect',
    'interior_designer', 'builder', 'roofer', 'tiler', 'landscaper',
    'hvac', 'locksmith', 'cleaner', 'other'
  )),
  phone text,
  email text,
  website text,
  notes text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz default now()
);

-- ============================================================
-- EVENTOS / CALENDARIO
-- ============================================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz,
  all_day boolean default false,
  event_type text default 'other' check (event_type in (
    'visit', 'delivery', 'work', 'milestone', 'meeting', 'other'
  )),
  room_id uuid references public.rooms(id) on delete set null,
  contractor_id uuid references public.contractors(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================
-- PERFILES DE USUARIO (datos extra de auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_households_updated_at
  before update on public.households
  for each row execute procedure public.handle_updated_at();

create trigger handle_rooms_updated_at
  before update on public.rooms
  for each row execute procedure public.handle_updated_at();

create trigger handle_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- Trigger para crear perfil al registrar usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Función de utilidad: devuelve los household_ids del usuario actual
create or replace function public.my_household_ids()
returns setof uuid language sql security definer stable as $$
  select household_id from public.household_members
  where user_id = auth.uid();
$$;

-- Habilitar RLS en todas las tablas
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invitations enable row level security;
alter table public.rooms enable row level security;
alter table public.measurements enable row level security;
alter table public.photos enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.household_budget enable row level security;
alter table public.shopping_items enable row level security;
alter table public.contractors enable row level security;
alter table public.events enable row level security;
alter table public.profiles enable row level security;

-- HOUSEHOLDS
create policy "Miembros pueden ver su hogar"
  on public.households for select
  using (id in (select public.my_household_ids()));

create policy "Propietario puede actualizar su hogar"
  on public.households for update
  using (created_by = auth.uid());

create policy "Usuario autenticado puede crear hogar"
  on public.households for insert
  with check (auth.uid() is not null);

-- HOUSEHOLD_MEMBERS
create policy "Ver miembros del hogar propio"
  on public.household_members for select
  using (household_id in (select public.my_household_ids()));

create policy "Owner puede gestionar miembros"
  on public.household_members for all
  using (
    household_id in (
      select id from public.households where created_by = auth.uid()
    )
  );

create policy "Usuario puede unirse con token válido"
  on public.household_members for insert
  with check (user_id = auth.uid());

-- INVITATIONS
create policy "Ver invitaciones del hogar propio"
  on public.invitations for select
  using (household_id in (select public.my_household_ids()));

create policy "Owner puede crear invitaciones"
  on public.invitations for insert
  with check (
    household_id in (
      select id from public.households where created_by = auth.uid()
    )
  );

-- Políticas genéricas para las demás tablas (miembros del hogar)
create policy "Miembros pueden ver rooms"
  on public.rooms for select
  using (household_id in (select public.my_household_ids()));
create policy "Miembros pueden gestionar rooms"
  on public.rooms for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver measurements del hogar"
  on public.measurements for select
  using (room_id in (select id from public.rooms where household_id in (select public.my_household_ids())));
create policy "Gestionar measurements"
  on public.measurements for all
  using (room_id in (select id from public.rooms where household_id in (select public.my_household_ids())));

create policy "Ver photos"
  on public.photos for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar photos"
  on public.photos for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver tasks"
  on public.tasks for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar tasks"
  on public.tasks for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver expenses"
  on public.expenses for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar expenses"
  on public.expenses for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver budget"
  on public.household_budget for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar budget"
  on public.household_budget for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver shopping_items"
  on public.shopping_items for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar shopping_items"
  on public.shopping_items for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver contractors"
  on public.contractors for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar contractors"
  on public.contractors for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver events"
  on public.events for select
  using (household_id in (select public.my_household_ids()));
create policy "Gestionar events"
  on public.events for all
  using (household_id in (select public.my_household_ids()));

create policy "Ver propio perfil"
  on public.profiles for select
  using (id = auth.uid() or id in (
    select user_id from public.household_members
    where household_id in (select public.my_household_ids())
  ));
create policy "Actualizar propio perfil"
  on public.profiles for update
  using (id = auth.uid());

-- ============================================================
-- STORAGE: bucket para fotos de la app
-- ============================================================
insert into storage.buckets (id, name, public)
values ('lpv-media', 'lpv-media', false)
on conflict do nothing;

create policy "Miembros pueden subir fotos"
  on storage.objects for insert
  with check (bucket_id = 'lpv-media' and auth.uid() is not null);

create policy "Miembros pueden ver fotos"
  on storage.objects for select
  using (bucket_id = 'lpv-media' and auth.uid() is not null);

create policy "Miembros pueden borrar fotos propias"
  on storage.objects for delete
  using (bucket_id = 'lpv-media' and owner = auth.uid());
