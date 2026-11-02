-- Recalculate championship and participation totals so a host department
-- cannot score points from its own organized events.
create or replace view leaderboard as
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
