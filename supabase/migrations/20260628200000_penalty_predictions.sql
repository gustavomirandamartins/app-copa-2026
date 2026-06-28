begin;

alter table public.matches
  add column home_penalties integer,
  add column away_penalties integer;

alter table public.predictions
  add column penalty_winner_id text references public.teams(id);

grant insert (penalty_winner_id) on public.predictions to authenticated;
grant update (penalty_winner_id) on public.predictions to authenticated;

commit;
