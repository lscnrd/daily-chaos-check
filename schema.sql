-- Health Trail Planner — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.
-- Requires Supabase Auth to already be enabled (it is, by default).
-- Table names match what src/storageSupabase.js expects.

-- ============================================================
-- 1. Personal key-value storage
-- Mirrors the artifact's window.storage(key, value, shared=false).
-- One row per (user, key) — e.g. key = "health-data" holds the same big
-- JSON blob the app already produces (entries, allergies, profile, etc.).
-- ============================================================
create table if not exists personal_data (
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table personal_data enable row level security;

create policy "read own personal data"
  on personal_data for select
  using (auth.uid() = user_id);

create policy "write own personal data"
  on personal_data for insert
  with check (auth.uid() = user_id);

create policy "update own personal data"
  on personal_data for update
  using (auth.uid() = user_id);

create policy "delete own personal data"
  on personal_data for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 2. Shared key-value storage
-- Mirrors window.storage(key, value, shared=true) — used today for the
-- global "community-recipes" key. Readable and writable by anyone signed
-- in (matches the original artifact behavior: no moderation built in yet).
-- ============================================================
create table if not exists community_data (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

alter table community_data enable row level security;

create policy "read shared data"
  on community_data for select
  using (auth.role() = 'authenticated');

create policy "write shared data"
  on community_data for insert
  with check (auth.role() = 'authenticated');

create policy "update shared data"
  on community_data for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- 3. Households (Pro feature — schema ready now, not yet wired into the
-- app UI; see stripe-integration-plan.md section 1b for how this plugs
-- into subscription status).
-- ============================================================
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member', -- 'owner' | 'member'
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);

alter table households enable row level security;
alter table household_members enable row level security;

create policy "members can read their household"
  on households for select
  using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "members can read their household's member list"
  on household_members for select
  using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "authenticated users can create a household"
  on households for insert
  with check (auth.role() = 'authenticated');

create policy "owners can add members"
  on household_members for insert
  with check (
    household_id in (select household_id from household_members where user_id = auth.uid() and role = 'owner')
    or not exists (select 1 from household_members hm where hm.household_id = household_members.household_id)
  );

-- ============================================================
-- 4. Subscriptions (written only by the Stripe webhook, using the
-- service_role key server-side — never from the browser).
-- ============================================================
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text, -- 'pro_individual' | 'pro_household'
  household_id uuid references households(id),
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);
-- ============================================================
-- 5. Usage analytics (for you as the app owner, not visible to users)
-- One row per app session. Kept intentionally minimal — just enough to
-- answer "how often is this actually being used", not full event tracking.
-- Query this from the Supabase dashboard (SQL editor) using your own
-- account, which uses the service role and bypasses RLS — regular users
-- can only ever insert their own rows, never read anyone's usage data.
-- ============================================================
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null, -- 'session_start' for now; add more later if needed
  metadata jsonb,
  created_at timestamptz default now()
);

alter table analytics_events enable row level security;

create policy "insert own analytics events"
  on analytics_events for insert
  with check (auth.uid() = user_id);
-- Intentionally no select policy for regular users — only you, querying
-- via the Supabase dashboard (service role), can read this table.

