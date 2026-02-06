-- Create typing_indicators table for real-time typing status
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to ensure one entry per user per conversation
CREATE UNIQUE INDEX typing_indicators_unique ON public.typing_indicators(conversation_id, user_id);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can view typing status in their conversations
CREATE POLICY "Users can view typing in their conversations"
ON public.typing_indicators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = typing_indicators.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can update their own typing status
CREATE POLICY "Users can update own typing status"
ON public.typing_indicators
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can modify own typing status"
ON public.typing_indicators
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own typing status"
ON public.typing_indicators
FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;