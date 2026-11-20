-- =====================================================================
-- Strategies table for Trading Strategy Management
-- Run this in Supabase SQL Editor
-- =====================================================================

create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  market text not null,         -- Indian, Forex, Crypto
  trend text not null,          -- Uptrend, Downtrend, Sideways
  timeframes text[] not null default '{}',
  explanation text not null default '',
  image_urls text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table strategies enable row level security;

-- RLS Policies
create policy "Users can view own strategies"
  on strategies for select
  using (auth.uid() = user_id);

create policy "Users can insert own strategies"
  on strategies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own strategies"
  on strategies for update
  using (auth.uid() = user_id);

create policy "Users can delete own strategies"
  on strategies for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_strategies_user_id on strategies(user_id);
create index idx_strategies_market on strategies(market);
create index idx_strategies_trend on strategies(trend);

-- Auto-update updated_at trigger
create or replace function update_strategies_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_strategies_updated_at
  before update on strategies
  for each row execute procedure update_strategies_updated_at();

-- =====================================================================
-- Storage bucket for strategy images
-- Run separately in Supabase Dashboard > Storage
-- =====================================================================
-- Bucket name: strategy-images
-- Public: false
-- Policies: authenticated users can upload/read their own files
