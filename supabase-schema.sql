-- Schema RTK
create schema if not exists rtk;

-- Categories
create table rtk.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null,
  color text not null
);

-- Reports
create table rtk.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  category_id uuid references rtk.categories not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  description text,
  photo_url text,
  created_at timestamptz default now()
);

-- Index for spatial queries
create index idx_reports_location on rtk.reports (lat, lng);
create index idx_reports_category on rtk.reports (category_id);
create index idx_reports_created_at on rtk.reports (created_at desc);

-- Seed categories
insert into rtk.categories (name, slug, icon, color) values
  ('Bache', 'bache', 'CircleDot', '#ef4444'),
  ('Señalética', 'senaletica', 'Signpost', '#f97316'),
  ('Luminaria', 'luminaria', 'Lightbulb', '#eab308'),
  ('Accidente', 'accidente', 'TriangleAlert', '#dc2626'),
  ('Robo', 'robo', 'Shield', '#8b5cf6');

-- RLS: categories are public read
alter table rtk.categories enable row level security;
create policy "Categories are public read"
  on rtk.categories for select
  using (true);

-- RLS: reports
alter table rtk.reports enable row level security;

create policy "Reports are public read"
  on rtk.reports for select
  using (true);

create policy "Authenticated users can insert"
  on rtk.reports for insert
  with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Users can update own reports"
  on rtk.reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Report votes
create table rtk.report_votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references rtk.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  vote text not null check (vote in ('up', 'down')),
  created_at timestamptz default now(),
  unique(report_id, user_id)
);

create index idx_report_votes_report on rtk.report_votes (report_id);
create index idx_report_votes_user on rtk.report_votes (user_id);

alter table rtk.report_votes enable row level security;

create policy "Votes are public read"
  on rtk.report_votes for select
  using (true);

create policy "Authenticated users can upsert own votes"
  on rtk.report_votes for insert
  with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Users can update own votes"
  on rtk.report_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- App config
create table rtk.app_config (
  key text primary key,
  value jsonb not null
);

insert into rtk.app_config (key, value) values
  ('cooldown_seconds', '10'),
  ('downvote_threshold', '10'),
  ('min_upvotes_to_avoid_cooldown', '1');

alter table rtk.app_config enable row level security;

create policy "Config is public read"
  on rtk.app_config for select
  using (true);
