create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  telefone text,
  cpf text,
  role text not null default 'iniciante' check (role in ('iniciante','vip','admin')),
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  checkout_url text not null,
  member_name text not null,
  whatsapp text not null,
  visibility text not null default 'publico' check (visibility in ('publico','vip')),
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id bigint generated always as identity primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  url text not null,
  level text not null default 'iniciante' check (level in ('iniciante','vip')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.products enable row level security;
alter table public.materials enable row level security;

create policy if not exists "profile_select_own" on public.profiles
for select using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "profile_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy if not exists "profile_update_admin" on public.profiles
for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy if not exists "posts_select_all" on public.community_posts
for select using (true);

create policy if not exists "posts_insert_logged" on public.community_posts
for insert with check (auth.uid() = user_id);

create policy if not exists "products_select_public_and_vip" on public.products
for select using (
  visibility = 'publico'
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vip','admin'))
);

create policy if not exists "products_insert_logged" on public.products
for insert with check (auth.uid() = created_by);

create policy if not exists "materials_select_by_role" on public.materials
for select using (
  level = 'iniciante'
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('vip','admin'))
);

create policy if not exists "materials_insert_admin" on public.materials
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Depois de criar sua primeira conta no app, rode isso trocando pelo email do admin:
-- update public.profiles set role = 'admin' where email = 'SEU_EMAIL_AQUI';
