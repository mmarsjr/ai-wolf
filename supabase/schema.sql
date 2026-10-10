-- Run in Supabase SQL Editor.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
-- Users may read only their own subscription. Writes happen through the server-side webhook using service role.
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
-- No client insert/update/delete policies: subscription state must only be changed by verified server webhook.
