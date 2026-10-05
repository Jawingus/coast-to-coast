-- Coast to Coast: guesses (for real rarity) and scores (for the daily leaderboard)
create table if not exists public.guesses (
  prompt text not null,
  answer text not null,
  n bigint not null default 0,
  primary key (prompt, answer)
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  day date not null,
  board text not null,
  name text not null,
  feet int not null,
  goals int not null,
  device text not null,
  created_at timestamptz not null default now(),
  unique (day, board, device)
);
create index if not exists scores_day_board_feet on public.scores (day, board, feet desc);

-- Anyone may read; nobody may write directly. Writes go through the two functions below.
alter table public.guesses enable row level security;
alter table public.scores enable row level security;
drop policy if exists "anyone can read guesses" on public.guesses;
create policy "anyone can read guesses" on public.guesses for select using (true);
drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores for select using (true);

create or replace function public.log_guess(p_prompt text, p_answer text)
returns void language sql security definer set search_path = public as $$
  insert into guesses (prompt, answer, n)
  values (left(p_prompt, 80), left(p_answer, 60), 1)
  on conflict (prompt, answer) do update set n = guesses.n + 1;
$$;

create or replace function public.submit_score(p_day date, p_board text, p_name text, p_feet int, p_goals int, p_device text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_feet < 0 or p_feet > 1400 or p_goals < 0 or p_goals > 7
     or p_name !~ '^[A-Za-z0-9 _.-]{1,16}$'
     or p_day < current_date - 1 or p_day > current_date + 1 then
    raise exception 'score rejected';
  end if;
  insert into scores (day, board, name, feet, goals, device)
  values (p_day, left(p_board, 24), trim(p_name), p_feet, p_goals, left(p_device, 40))
  on conflict (day, board, device) do nothing;
end;
$$;

grant usage on schema public to anon;
revoke all on public.guesses, public.scores from anon;
grant select on public.guesses to anon;
grant select (day, board, name, feet, goals, created_at) on public.scores to anon;
grant execute on function public.log_guess(text, text) to anon;
grant execute on function public.submit_score(date, text, text, int, int, text) to anon;
