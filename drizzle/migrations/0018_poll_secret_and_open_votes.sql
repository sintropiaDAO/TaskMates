ALTER TABLE public.polls ADD COLUMN secret_vote boolean NOT NULL DEFAULT true;
CREATE FUNCTION public.guard_poll_vote_mode() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
IF NEW.secret_vote IS DISTINCT FROM OLD.secret_vote AND (NOT OLD.secret_vote OR EXISTS (SELECT 1 FROM public.poll_votes WHERE poll_id=OLD.id)) THEN
RAISE EXCEPTION 'A configuração de voto não pode ser alterada em votações abertas ou que já receberam votos.' USING ERRCODE='23514';
END IF; RETURN NEW; END; $$;
CREATE TRIGGER guard_poll_vote_mode BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.guard_poll_vote_mode();
CREATE FUNCTION public.can_read_poll_ballot(_poll_id uuid, _voter_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.can_view_entity('poll', _poll_id) AND (_voter_id=auth.uid() OR EXISTS (SELECT 1 FROM public.polls WHERE id=_poll_id AND NOT secret_vote)); $$;
ALTER POLICY "Anyone can view poll_votes" ON public.poll_votes USING (public.can_read_poll_ballot(poll_id,user_id));
CREATE VIEW public.poll_vote_display WITH (security_barrier=true) AS
WITH totals AS (SELECT poll_id, jsonb_object_agg(option_id::text,n) AS vote_counts FROM (SELECT poll_id,option_id,count(*) AS n FROM public.poll_votes GROUP BY poll_id,option_id) c GROUP BY poll_id)
SELECT v.id,v.poll_id,v.user_id,v.question_id,v.created_at,
CASE WHEN NOT p.secret_vote OR v.user_id=auth.uid() THEN v.option_id ELSE NULL::uuid END AS option_id,
t.vote_counts FROM public.poll_votes v JOIN public.polls p ON p.id=v.poll_id JOIN totals t ON t.poll_id=v.poll_id WHERE public.can_view_entity('poll',v.poll_id);
GRANT SELECT ON public.poll_vote_display TO anon,authenticated,service_role;