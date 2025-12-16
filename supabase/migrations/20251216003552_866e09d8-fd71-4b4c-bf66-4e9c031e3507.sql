-- Fix 1: Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Fix 2: Create a secure function for creating notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _task_id uuid,
  _type text,
  _message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
BEGIN
  -- Only allow authenticated users to create notifications
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  INSERT INTO public.notifications (user_id, task_id, type, message)
  VALUES (_user_id, _task_id, _type, _message)
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Fix 3: Update the INSERT policy for notifications to only allow service role
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Service role can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');