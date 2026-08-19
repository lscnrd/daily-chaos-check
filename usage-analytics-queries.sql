-- Usage analytics queries — run these in the Supabase SQL Editor (as
-- yourself, the project owner) to see how often the app is being used.
-- Regular users can never run these against other people's data — RLS
-- only lets them insert their own session_start events, never read any.

-- 1. How many times has each user opened the app, and when were they last active?
select
  user_id,
  count(*) as total_sessions,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from analytics_events
where event_type = 'session_start'
group by user_id
order by total_sessions desc;

-- 2. Daily active users (last 30 days) — good for a simple growth chart
select
  date_trunc('day', created_at)::date as day,
  count(distinct user_id) as active_users
from analytics_events
where event_type = 'session_start'
  and created_at > now() - interval '30 days'
group by 1
order by 1;

-- 3. Weekly active users (last 12 weeks)
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) as active_users
from analytics_events
where event_type = 'session_start'
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;

-- 4. "Sticky" users — opened the app on 3+ separate days in the last 7 days
select
  user_id,
  count(distinct created_at::date) as active_days_last_week
from analytics_events
where event_type = 'session_start'
  and created_at > now() - interval '7 days'
group by user_id
having count(distinct created_at::date) >= 3
order by active_days_last_week desc;

-- 5. Churn risk — signed up more than 14 days ago, but haven't opened it in 7+ days
select
  u.id as user_id,
  u.email,
  max(a.created_at) as last_seen
from auth.users u
left join analytics_events a on a.user_id = u.id and a.event_type = 'session_start'
where u.created_at < now() - interval '14 days'
group by u.id, u.email
having max(a.created_at) < now() - interval '7 days' or max(a.created_at) is null
order by last_seen asc nulls first;
