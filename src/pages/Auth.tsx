import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        const tagId = searchParams.get('tag');
        if (tagId) {
          navigate(`/profile/edit?tag=${tagId}`);
        } else {
          navigate('/dashboard');
        }
      }
    }
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
