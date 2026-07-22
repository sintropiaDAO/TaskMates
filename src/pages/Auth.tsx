import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (loading || !user || handledRef.current) return;
    handledRef.current = true;

    const run = async () => {
      const redirect = searchParams.get('redirect');
      const tagId = searchParams.get('tag');

      if (tagId) {
        // Auto-follow the tag (community or otherwise) that brought the user here
        try {
          await supabase
            .from('user_tags')
            .insert({ user_id: user.id, tag_id: tagId });
        } catch {
          // ignore duplicates / errors — best effort
        }
        // Accept any pending invite for this tag
        try {
          await supabase
            .from('community_invites')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('tag_id', tagId)
            .eq('invited_user_id', user.id)
            .eq('status', 'pending');
        } catch {
          // ignore
        }
        navigate(`/tags/${tagId}`, { replace: true });
        return;
      }

      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }

      navigate('/dashboard', { replace: true });
    };

    run();
  }, [user, loading, navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return <AuthForm />;
};

export default Auth;
