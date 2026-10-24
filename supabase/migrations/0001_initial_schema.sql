-- RidgeWatch initial schema. Review with the project lead before production use.
-- Requires PostGIS extension. Apply to a non-production Supabase project first.
create extension if not exists postgis with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.catchments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,
  geometry extensions.geometry(MultiPolygon, 4326),
  geometry_source text,
  validation_status text not null default 'unvalidated'
    check (validation_status in ('unvalidated','reviewed','validated','demo')),
  is_demo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_observations (
  id uuid primary key default gen_random_uuid(),
  catchment_id uuid references public.catchments(id) on delete cascade,
  provider text not null,
  source_record_id text,
  variable text not null,
  value_numeric double precision,
  value_text text,
  unit text,
  observed_at timestamptz,
  issued_at timestamptz,
  fetched_at timestamptz not null default now(),
  valid_from timestamptz,
  valid_to timestamptz,
  source_state text not null default 'unavailable'
    check (source_state in ('live','stale','unavailable','error','demo','partial')),
  spatial_coverage jsonb not null default '{}'::jsonb,
  quality_flags jsonb not null default '[]'::jsonb,
  is_demo boolean not null default true,
  raw_reference text,
  created_at timestamptz not null default now()
);

create index if not exists source_observations_catchment_time_idx
  on public.source_observations(catchment_id, observed_at desc);
create index if not exists source_observations_provider_variable_idx
  on public.source_observations(provider, variable, fetched_at desc);

create table if not exists public.official_warnings (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  source_warning_id text,
  title text not null,
  severity text,
  description text,
  issued_at timestamptz,
  valid_from timestamptz,
  valid_to timestamptz,
  geography jsonb not null default '{}'::jsonb,
  source_url text,
  source_state text not null default 'unavailable'
    check (source_state in ('live','stale','unavailable','error','demo','partial')),
  is_demo boolean not null default true,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists official_warnings_issued_idx on public.official_warnings(issued_at desc);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  catchment_id uuid references public.catchments(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null
    check (status in ('low','moderate','high','very_high','insufficient_data','degraded','unavailable')),
  score double precision,
  score_semantics text not null default 'not_calibrated',
  model_version text not null,
  issued_at timestamptz not null default now(),
  data_coverage jsonb not null default '{}'::jsonb,
  reason_codes jsonb not null default '[]'::jsonb,
  source_ids uuid[] not null default '{}',
  is_demo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessments_catchment_issued_idx
  on public.assessments(catchment_id, issued_at desc);
create index if not exists assessments_requested_by_idx
  on public.assessments(requested_by, issued_at desc);

create table if not exists public.catchment_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catchment_id uuid not null references public.catchments(id) on delete cascade,
  enabled boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, catchment_id)
);

create table if not exists public.assessment_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  is_demo boolean not null default true
);

create index if not exists assessment_events_assessment_time_idx
  on public.assessment_events(assessment_id, event_at desc);

-- Enable RLS. Public regional reference data should be exposed only through reviewed
-- policies/views; don't make the whole table public by default.
alter table public.profiles enable row level security;
alter table public.catchments enable row level security;
alter table public.source_observations enable row level security;
alter table public.official_warnings enable row level security;
alter table public.assessments enable row level security;
alter table public.catchment_subscriptions enable row level security;
alter table public.assessment_events enable row level security;

create policy "Users can read own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can read own assessments"
  on public.assessments for select to authenticated
  using (requested_by = auth.uid());
create policy "Users can create own assessments"
  on public.assessments for insert to authenticated
  with check (requested_by = auth.uid());
create policy "Users can read own subscriptions"
  on public.catchment_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy "Users can manage own subscriptions"
  on public.catchment_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Regional data tables intentionally have no broad client write policies.
-- Add reviewed read policies or security-definer RPCs only after access requirements
-- are settled. Trusted backend ingestion should use server-side credentials.
