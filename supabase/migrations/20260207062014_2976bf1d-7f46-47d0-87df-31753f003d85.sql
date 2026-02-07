-- First, create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION public.user_is_conversation_participant(conv_id uuid, usr_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = conv_id 
    AND user_id = usr_id
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create a policy using the security definer function (no recursion)
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  public.user_is_conversation_participant(conversation_id, auth.uid())
);