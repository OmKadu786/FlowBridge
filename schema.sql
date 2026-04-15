-- FlowBridge Database Schema
-- Run this in Supabase SQL Editor

-- Clean Slate: Drop existing tables
drop table if exists activity_log cascade;
drop table if exists customers cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists stores cascade;
drop table if exists users cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users (Plaintext password as requested)
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null,
  created_at timestamptz not null default now()
);

-- Stores
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null default 'General',
  currency text not null default 'USD',
  tax_rate numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Add user_id to stores if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='stores' and column_name='user_id') then
    alter table stores add column user_id uuid references users(id) on delete cascade;
  end if;
end $$;

-- Products
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  pid text not null default upper(substring(md5(random()::text) from 1 for 8)),
  category text not null default 'General',
  stock integer not null default 0,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  attributes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(store_id, pid)
);

-- Orders
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  customer_email text,
  created_at timestamptz not null default now()
);

-- Customers
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  email text not null,
  order_count integer not null default 0,
  total_spent numeric not null default 0,
  last_seen timestamptz not null default now(),
  unique(store_id, email)
);

-- Activity Log
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  type text not null default 'system',
  message text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_products_store on products(store_id);
create index if not exists idx_orders_store on orders(store_id);
create index if not exists idx_customers_store on customers(store_id);
create index if not exists idx_activity_store on activity_log(store_id);

-- RLS (disable for now — no auth layer yet)
alter table stores enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table customers enable row level security;
alter table activity_log enable row level security;

-- Allow all operations (demo mode — no auth)
create policy "Allow all on stores" on stores for all using (true) with check (true);
create policy "Allow all on products" on products for all using (true) with check (true);
create policy "Allow all on orders" on orders for all using (true) with check (true);
create policy "Allow all on customers" on customers for all using (true) with check (true);
create policy "Allow all on activity_log" on activity_log for all using (true) with check (true);
