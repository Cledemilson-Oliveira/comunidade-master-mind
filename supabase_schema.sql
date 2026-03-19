-- COMUNIDADE MASTER MIND - SQL BASE
-- Rode no SQL Editor do Supabase

create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  whatsapp text,
  cpf text,
  access_level text not null default 'iniciante' check (access_level in ('iniciante', 'vip')),
  role text not null default 'member' check (role in ('member', 'admin')),
  member_status text not null default 'ativo' check (member_status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  price_label text not null,
  checkout_url text not null,
  support_whatsapp text,
  seller_name text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  link_url text not null,
  visibility text not null default 'publico' check (visibility in ('publico', 'membro', 'vip')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.products enable row level security;
alter table public.materials enable row level security;

-- PROFILES
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own_basic_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (
  auth.uid() = id or public.is_admin()
);

-- COMMUNITY POSTS
create policy "posts_select_all"
on public.community_posts
for select
using (true);

create policy "posts_insert_members"
on public.community_posts
for insert
with check (auth.uid() = user_id);

create policy "posts_delete_own_or_admin"
on public.community_posts
for delete
using (auth.uid() = user_id or public.is_admin());

-- PRODUCTS
create policy "products_select_active_all"
on public.products
for select
using (status = 'ativo' or public.is_admin());

create policy "products_admin_insert"
on public.products
for insert
with check (public.is_admin());

create policy "products_admin_update"
on public.products
for update
using (public.is_admin())
with check (public.is_admin());

create policy "products_admin_delete"
on public.products
for delete
using (public.is_admin());

-- MATERIALS
create policy "materials_select_by_visibility"
on public.materials
for select
using (
  visibility = 'publico'
  or (visibility = 'membro' and auth.uid() is not null)
  or (
    visibility = 'vip' and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.access_level = 'vip'
      )
    )
  )
);

create policy "materials_admin_insert"
on public.materials
for insert
with check (public.is_admin());

create policy "materials_admin_update"
on public.materials
for update
using (public.is_admin())
with check (public.is_admin());

create policy "materials_admin_delete"
on public.materials
for delete
using (public.is_admin());

-- Atualização automática do updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- IMPORTANTE:
-- Depois de criar sua própria conta pelo app, rode este SQL UMA VEZ para transformar seu usuário em admin:
-- update public.profiles
-- set role = 'admin', access_level = 'vip'
-- where email = 'SEU_EMAIL_AQUI';
