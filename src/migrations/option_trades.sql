-- =====================================================================
-- Option Trades table for Indian Market Options Chain Journal
-- Run this in Supabase SQL Editor
-- =====================================================================

create table if not exists option_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Contract Details
  underlying text not null,           -- NIFTY, BANKNIFTY, SENSEX, FINNIFTY, MIDCPNIFTY, CUSTOM
  custom_symbol text,                 -- when underlying = 'CUSTOM'
  strike_price numeric not null,
  option_type text not null,          -- CE or PE
  expiry_date date not null,
  side text not null,                 -- BUY or SELL

  -- Position Details
  entry_premium numeric not null,
  exit_premium numeric,
  lots integer not null default 1,
  lot_size integer not null,

  -- Computed Totals
  total_qty integer not null,
  entry_value numeric not null,
  exit_value numeric,

  -- P&L Breakdown (INR)
  gross_pnl numeric,
  brokerage numeric,
  stt numeric,
  other_charges numeric,
  net_pnl numeric,
  roi numeric,

  -- Psychology & Meta
  entry_emotion text not null,
  exit_emotion text,
  status text not null default 'Open',
  timestamp bigint not null,
  exit_timestamp bigint,
  notes text,
  exit_chart_url text,
  strategy text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table option_trades enable row level security;

-- RLS Policies: users can only see/edit their own trades
create policy "Users can view own option trades"
  on option_trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own option trades"
  on option_trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update own option trades"
  on option_trades for update
  using (auth.uid() = user_id);

create policy "Users can delete own option trades"
  on option_trades for delete
  using (auth.uid() = user_id);

-- Index for fast queries by user and date
create index idx_option_trades_user_id on option_trades(user_id);
create index idx_option_trades_timestamp on option_trades(timestamp desc);
create index idx_option_trades_expiry on option_trades(expiry_date);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_option_trades_updated_at
  before update on option_trades
  for each row execute procedure update_updated_at_column();
