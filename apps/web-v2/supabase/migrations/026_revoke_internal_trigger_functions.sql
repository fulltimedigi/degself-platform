-- Internal trigger/helpers must not be exposed as public RPC endpoints.
-- Also pin search_path on mutable functions reported by Supabase advisors.

do $$
declare
  fn regprocedure;
begin
  foreach fn in array array[
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.profiles_guard_columns()'),
    to_regprocedure('public.rls_auto_enable()')
  ] loop
    if fn is not null then
      execute format('revoke all on function %s from public, anon, authenticated', fn);
    end if;
  end loop;
end $$;

do $$
declare
  fn regprocedure;
begin
  foreach fn in array array[
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.update_workshop_rating()'),
    to_regprocedure('public.update_mentions_count()'),
    to_regprocedure('public.normalize_arabic(text)'),
    to_regprocedure('public.workshops_update_search_text()')
  ] loop
    if fn is not null then
      execute format('alter function %s set search_path = public', fn);
    end if;
  end loop;
end $$;
