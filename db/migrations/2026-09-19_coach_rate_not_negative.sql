-- `packages.price_cents` has had `>= 0` since it was created. The per-session
-- rate on coach_profiles never did, and `authenticated` holds an UPDATE grant
-- on that column -- so a coach could set their rate to a negative number and
-- every price the app derives from it would be wrong in the customer's favour.
--
-- The client will validate too, but the client is not the boundary. This is.
alter table public.coach_profiles
  drop constraint if exists coach_profiles_price_cents_check;
alter table public.coach_profiles
  add constraint coach_profiles_price_cents_check check (price_cents >= 0);

-- Applied live 19 September 2026 and verified as a real signed-in coach in a
-- rolled-back transaction:
--   set the rate to 4500   -> ok
--   set the rate to -1     -> refused
--   set it to 0            -> ok (0 means "no rate set"; the app reads it that
--                              way already and quotes nothing rather than
--                              inventing a figure)
