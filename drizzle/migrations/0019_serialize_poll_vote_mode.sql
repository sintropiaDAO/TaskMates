ALTER FUNCTION public.guard_poll_vote_mode() SECURITY DEFINER;
CREATE FUNCTION public.lock_poll_ballot_mode() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='UPDATE' AND (NEW.poll_id IS DISTINCT FROM OLD.poll_id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN RAISE EXCEPTION 'A identidade do voto não pode ser alterada.' USING ERRCODE='23514'; END IF;
PERFORM 1 FROM public.polls WHERE id=NEW.poll_id FOR UPDATE;
IF NOT EXISTS (SELECT 1 FROM public.poll_options WHERE id=NEW.option_id AND poll_id=NEW.poll_id AND question_id IS NOT DISTINCT FROM NEW.question_id) THEN RAISE EXCEPTION 'Opção inválida para esta votação.' USING ERRCODE='23514'; END IF;
RETURN NEW; END; $$;
CREATE TRIGGER lock_poll_ballot_mode BEFORE INSERT OR UPDATE ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION public.lock_poll_ballot_mode();