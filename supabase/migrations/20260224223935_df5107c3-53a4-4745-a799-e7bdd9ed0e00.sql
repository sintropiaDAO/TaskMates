
-- Drop and recreate trigger to also fire on UPDATE of created_by
DROP TRIGGER IF EXISTS auto_add_community_admin_trigger ON public.tags;

CREATE TRIGGER auto_add_community_admin_trigger
  AFTER INSERT OR UPDATE OF created_by ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_community_admin();
