-- Belt Catalog Migration
-- Run this in Supabase SQL editor

-- 1) Belt catalog table
create table if not exists public.belt_catalog (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null unique,
  display_name text not null,
  manufacturer text,
  material text not null,
  surface text,
  food_grade boolean not null default false,
  cut_resistant boolean not null default false,
  oil_resistant boolean not null default false,
  abrasion_resistant boolean not null default false,
  antistatic boolean not null default false,
  thickness_in numeric,
  piw numeric not null,
  pil numeric not null,
  min_pulley_dia_no_vguide_in numeric not null,
  min_pulley_dia_with_vguide_in numeric not null,
  notes text,
  tags text[],
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_belt_catalog_updated_at on public.belt_catalog;
create trigger trg_belt_catalog_updated_at
before update on public.belt_catalog
for each row execute function public.set_updated_at();

-- 2) Versions table for audit trail
create table if not exists public.belt_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  belt_id uuid not null references public.belt_catalog(id) on delete cascade,
  version int not null,
  data jsonb not null,
  change_reason text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique(belt_id, version)
);

-- 3) Helper function to snapshot before update
create or replace function public.snapshot_belt_catalog_before_update()
returns trigger language plpgsql as $$
declare
  next_version int;
begin
  select coalesce(max(version), 0) + 1 into next_version
  from public.belt_catalog_versions
  where belt_id = old.id;

  insert into public.belt_catalog_versions (belt_id, version, data, change_reason, changed_by)
  values (
    old.id,
    next_version,
    to_jsonb(old),
    coalesce(current_setting('app.change_reason', true), 'edit'),
    nullif(current_setting('app.changed_by', true), '')::uuid
  );

  return new;
end $$;

drop trigger if exists trg_belt_catalog_snapshot on public.belt_catalog;
create trigger trg_belt_catalog_snapshot
before update on public.belt_catalog
for each row execute function public.snapshot_belt_catalog_before_update();

-- 4) Enable RLS
alter table public.belt_catalog enable row level security;
alter table public.belt_catalog_versions enable row level security;

-- 5) RLS policies for belt_catalog
-- Everyone authenticated can read active belts
drop policy if exists "read active belts" on public.belt_catalog;
create policy "read active belts"
on public.belt_catalog
for select
to authenticated
using (is_active = true);

-- Anon can also read active belts (for public access)
drop policy if exists "anon read active belts" on public.belt_catalog;
create policy "anon read active belts"
on public.belt_catalog
for select
to anon
using (is_active = true);

-- 6) Seed sample belts
insert into public.belt_catalog
  (catalog_key, display_name, manufacturer, material, surface, food_grade, cut_resistant, piw, pil,
   min_pulley_dia_no_vguide_in, min_pulley_dia_with_vguide_in, thickness_in, tags, is_active)
values
  ('STD_PVC_120PIW', 'Standard PVC 120 PIW', 'Internal', 'PVC', 'smooth', false, false, 120, 100,
   3.0, 4.0, 0.125, array['standard','pvc'], true),
  ('FG_PU_CLEAR_MATTE_150PIW', 'Food Grade Clear Matte PU 150 PIW', 'Internal', 'Polyurethane', 'matte', true, true, 150, 120,
   4.0, 5.0, 0.094, array['food-grade','cut-resistant','pu'], true),
  ('HD_PVC_200PIW', 'Heavy Duty PVC 200 PIW', 'Internal', 'PVC', 'textured', false, false, 200, 160,
   4.0, 5.0, 0.188, array['heavy-duty','pvc'], true),
  ('URETHANE_180PIW', 'Standard Urethane 180 PIW', 'Internal', 'Urethane', 'smooth', false, true, 180, 140,
   3.5, 4.5, 0.156, array['urethane','cut-resistant'], true)
on conflict (catalog_key) do nothing;
