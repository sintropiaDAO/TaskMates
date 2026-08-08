ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_entity_unique
  ON public.conversations (entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_or_create_entity_conversation(
  _entity_type text,
  _entity_id uuid,
  _name text,
  _member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor uuid := auth.uid();
  _conv_id uuid;
  _members uuid[];
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _entity_type NOT IN ('task', 'product', 'poll', 'tag') THEN
    RAISE EXCEPTION 'Invalid entity type';
  END IF;

  SELECT array_agg(DISTINCT m) INTO _members
  FROM unnest(_member_ids) AS m
  WHERE m IS NOT NULL;

  IF _members IS NULL OR array_length(_members, 1) < 2 THEN
    RAISE EXCEPTION 'A group chat needs at least two people';
  END IF;

  IF NOT (_actor = ANY(_members)) THEN
    RAISE EXCEPTION 'You are not part of this group';
  END IF;

  SELECT id INTO _conv_id
  FROM public.conversations
  WHERE entity_type = _entity_type AND entity_id = _entity_id;

  IF _conv_id IS NULL THEN
    INSERT INTO public.conversations (type, name, entity_type, entity_id, task_id)
    VALUES (
      CASE WHEN _entity_type = 'task' THEN 'task' ELSE 'group' END,
      _name,
      _entity_type,
      _entity_id,
      CASE WHEN _entity_type = 'task' THEN _entity_id ELSE NULL END
    )
    RETURNING id INTO _conv_id;
  ELSIF _name IS NOT NULL THEN
    UPDATE public.conversations SET name = _name WHERE id = _conv_id AND name IS DISTINCT FROM _name;
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT _conv_id, m
  FROM unnest(_members) AS m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.conversation_participants p
    WHERE p.conversation_id = _conv_id AND p.user_id = m
  );

  RETURN _conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_entity_conversation(text, uuid, text, uuid[]) TO authenticated;