CREATE OR REPLACE FUNCTION public.get_public_title_form(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.can_view_profile(_user_id)
    THEN coalesce((SELECT title_form FROM public.guild_quiz_results WHERE user_id = _user_id), 'neutral')
    ELSE 'neutral' END;
$$;
REVOKE ALL ON FUNCTION public.get_public_title_form(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_title_form(uuid) TO anon, authenticated;