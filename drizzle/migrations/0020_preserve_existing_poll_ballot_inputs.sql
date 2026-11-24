CREATE OR REPLACE FUNCTION public.lock_poll_ballot_mode() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
PERFORM 1 FROM public.polls WHERE id=NEW.poll_id FOR UPDATE;
RETURN NEW; END; $$;