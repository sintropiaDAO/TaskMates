-- Drop the policy again
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create a simple non-recursive policy
-- A user can view a participant record if they are that participant 
-- OR if they share a conversation with them (checked via direct table access without policy)
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants AS my_participation
    WHERE my_participation.user_id = auth.uid() 
    AND my_participation.conversation_id = conversation_participants.conversation_id
  )
);