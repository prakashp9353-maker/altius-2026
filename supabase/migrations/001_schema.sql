-- ALTIUS 2026 schema. Run in Supabase SQL Editor (or `supabase db push`).
create extension if not exists pgcrypto;

create table departments(
 id uuid primary key default gen_random_uuid(),
 name text not null unique, slug text not null unique,
 description text not null default '', sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table admin_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'admin' check (role in ('admin','super_admin')),
 created_at timestamptz not null default now());

create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from admin_profiles where user_id=auth.uid()) $$;

create table events(
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 150),
 department_id uuid not null references departments(id) on delete restrict,
 category text not null check (category in ('Technical','Non-Technical')),
 tagline text, description text, poster_path text,
 event_date date, start_time time, end_time time, venue text,
 form_url text check (form_url is null or form_url ~* '^https?://'),
 rules text, entry_fee text, contact_person text, contact_phone text,
 status text not null default 'upcoming' check (status in ('upcoming','ongoing','completed')),
 featured boolean not null default false, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on events(department_id); create index on events(published, featured);

create table event_results(
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null unique references events(id) on delete cascade,
 winner_dept_id uuid references departments(id), runner_dept_id uuid references departments(id),
 winner_name text, runner_name text,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 provisional boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (winner_dept_id is null or runner_dept_id is null or winner_dept_id<>runner_dept_id));

create table participation_records(
 id uuid primary key default gen_random_uuid(),
 department_id uuid not null references departments(id),
 event_id uuid references events(id) on delete set null,
 period_label text not null default '',
 eligible_count int not null check (eligible_count>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
-- Prevent multiple participation entries for the same department/event, even if
-- an admin changes the reporting label. Period-only records are unique by label.
create unique index participation_event_unique on participation_records (department_id, event_id) where event_id is not null;
create unique index participation_period_unique on participation_records (department_id, lower(period_label)) where event_id is null;

create table bonus_records(
 id uuid primary key default gen_random_uuid(),
 department_id uuid not null references departments(id),
 reference_label text not null,
 recipients int not null check (recipients>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(department_id, reference_label));

create table announcements(
 id uuid primary key default gen_random_uuid(),
 title text not null, body text not null default '', image_url text, attachment_url text,
 important boolean not null default false, published boolean not null default false,
 publish_at timestamptz not null default now(), created_at timestamptz not null default now());

create table score_audit_logs(
 id bigint generated always as identity primary key,
 table_name text not null, record_id uuid, action text not null,
 old_data jsonb, new_data jsonb, changed_by uuid, changed_at timestamptz not null default now());

create table site_settings(key text primary key, value text not null, updated_at timestamptz not null default now());

create or replace function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create or replace function log_score_change() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into score_audit_logs(table_name,record_id,action,old_data,new_data,changed_by)
 values(tg_table_name, coalesce(new.id,old.id), tg_op, case when tg_op<>'INSERT' then to_jsonb(old) end,
 case when tg_op<>'DELETE' then to_jsonb(new) end, auth.uid()); return null; end $$;
do $$ declare t text; begin
 foreach t in array array['departments','events','event_results','participation_records','bonus_records'] loop
  execute format('create trigger touch before update on %I for each row execute function touch_updated()',t); end loop;
 foreach t in array array['event_results','participation_records','bonus_records'] loop
  execute format('create trigger audit after insert or update or delete on %I for each row execute function log_score_change()',t); end loop;
end $$;

-- Single source of truth for scores: totals are always computed here.
create view leaderboard as
with w as (
  select er.winner_dept_id d, count(*)::int n
  from event_results er join events e on e.id=er.event_id
  where er.status='approved' and er.winner_dept_id is not null and er.winner_dept_id<>e.department_id
  group by 1),
r as (
  select er.runner_dept_id d, count(*)::int n
  from event_results er join events e on e.id=er.event_id
  where er.status='approved' and er.runner_dept_id is not null and er.runner_dept_id<>e.department_id
  group by 1),
p as (
  select pr.department_id d, sum(pr.eligible_count)::int n
  from participation_records pr left join events e on e.id=pr.event_id
  where pr.event_id is null or pr.department_id<>e.department_id
  group by 1),
b as (select department_id d, sum(recipients)::int n from bonus_records group by 1),
base as (select dp.id department_id, dp.name, dp.slug,
  coalesce(w.n,0)*5 winner_points, coalesce(r.n,0)*3 runner_points,
  coalesce(p.n,0) participation_points, coalesce(b.n,0)*5 bonus_points,
  coalesce(w.n,0) firsts, coalesce(r.n,0) seconds
 from departments dp left join w on w.d=dp.id left join r on r.d=dp.id left join p on p.d=dp.id left join b on b.d=dp.id),
t as (select *, winner_points+runner_points+participation_points+bonus_points total_points from base)
select t.*, rank() over (order by total_points desc, firsts desc, seconds desc)::int rank,
 (select max(changed_at) from score_audit_logs) last_updated from t;
grant select on leaderboard to anon, authenticated;

-- RLS
do $$ declare t text; begin
 foreach t in array array['departments','admin_profiles','events','event_results','participation_records','bonus_records','announcements','score_audit_logs','site_settings'] loop
  execute format('alter table %I enable row level security',t);
  if t<>'admin_profiles' then execute format('create policy "admin all" on %I for all to authenticated using (is_admin()) with check (is_admin())',t); end if;
 end loop; end $$;
create policy "public read" on departments for select using (true);
create policy "public read" on site_settings for select using (true);
create policy "public read" on events for select using (published);
create policy "public read" on event_results for select using (status='approved');
create policy "public read" on announcements for select using (published and publish_at<=now());
create policy "own profile" on admin_profiles for select to authenticated using (user_id=auth.uid());
-- participation_records, bonus_records, score_audit_logs: admin only (public sees aggregated leaderboard view)

-- Storage
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('event-posters','event-posters',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "posters public read" on storage.objects for select using (bucket_id='event-posters');
create policy "posters admin insert" on storage.objects for insert to authenticated with check (bucket_id='event-posters' and is_admin());
create policy "posters admin update" on storage.objects for update to authenticated using (bucket_id='event-posters' and is_admin());
create policy "posters admin delete" on storage.objects for delete to authenticated using (bucket_id='event-posters' and is_admin());

-- Seed the 17 departments
insert into departments(name,slug,sort_order)
select n, trim(both '-' from lower(regexp_replace(n,'[^a-zA-Z0-9]+','-','g'))), i
from unnest(array['1st Year Electrical Cycle','1st Year Physics Cycle','AE','AI&DS','AI&ML','AU','CSBS','CSE','ECE','EEE','ISE/CSD','Isiri Kannada Sangha','MBA','MCA','ME','MR','SU CSE/AIML']) with ordinality as x(n,i);
