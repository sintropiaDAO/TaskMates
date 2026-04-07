
-- Create community_invites table for invitation system
CREATE TABLE public.community_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tag_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can view invites they sent or received
CREATE POLICY "Users can view own invites"
  ON public.community_invites FOR SELECT
  TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

-- Community admins can view all invites for their communities
CREATE POLICY "Community admins can view community invites"
  ON public.community_invites FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_admins ca
    WHERE ca.tag_id = community_invites.tag_id AND ca.user_id = auth.uid()
  ));

-- Community admins can create invites
CREATE POLICY "Community admins can create invites"
  ON public.community_invites FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.community_admins ca
    WHERE ca.tag_id = community_invites.tag_id AND ca.user_id = auth.uid()
  ));

-- Invited users can update their own invite (accept/reject)
CREATE POLICY "Invited users can update own invite"
  ON public.community_invites FOR UPDATE
  TO authenticated
  USING (invited_user_id = auth.uid());

-- Community admins can delete invites
CREATE POLICY "Community admins can delete invites"
  ON public.community_invites FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_admins ca
    WHERE ca.tag_id = community_invites.tag_id AND ca.user_id = auth.uid()
  ));
