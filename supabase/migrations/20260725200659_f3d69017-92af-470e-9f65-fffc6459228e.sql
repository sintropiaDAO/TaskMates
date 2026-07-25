CREATE OR REPLACE FUNCTION public.can_join_conversation(_conversation_id uuid, _actor_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _actor_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = _conversation_id)
    AND (
      -- brand new conversation (creation flow): no participants yet
      NOT EXISTS (
        SELECT 1 FROM public.conversation_participants p
        WHERE p.conversation_id = _conversation_id
      )
      -- existing member may add participants
      OR public.user_is_conversation_participant(_conversation_id, _actor_id)
      -- task chats: owner or approved collaborator may join themselves
      OR (
        _target_user_id = _actor_id
        AND EXISTS (
          SELECT 1
          FROM public.conversations c
          JOIN public.tasks t ON t.id = c.task_id
          WHERE c.id = _conversation_id
            AND c.type = 'task'
            AND (
              t.created_by = _actor_id
              OR EXISTS (
                SELECT 1 FROM public.task_collaborators tc
                WHERE tc.task_id = t.id
                  AND tc.user_id = _actor_id
                  AND tc.approval_status = 'approved'
              )
            )
        )
      )
    );
$$;

DROP POLICY IF EXISTS "Users can add self or others to own conversations" ON public.conversation_participants;

CREATE POLICY "Members or task participants can add conversation participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (public.can_join_conversation(conversation_id, auth.uid(), user_id));