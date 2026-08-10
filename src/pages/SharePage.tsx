import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from '@/lib/router-compat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, LogIn, ArrowRight, ListTodo, Package, BarChart3, ArrowLeft } from 'lucide-react';

type ShareType = 'task' | 'poll' | 'product';

interface ItemPreview {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  created_by: string;
  owner?: { full_name: string | null; avatar_url: string | null } | null;
}

const TYPE_TABLE: Record<ShareType, string> = {
  task: 'tasks',
  poll: 'polls',
  product: 'products',
};

export default function SharePage() {
  const { type, id } = useParams<{ type: ShareType; id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [item, setItem] = useState<ItemPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const validType = type === 'task' || type === 'poll' || type === 'product';

  useEffect(() => {
    if (!validType || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const table = TYPE_TABLE[type as ShareType];
      const hasImage = type !== 'poll';
      const cols = hasImage ? 'id, title, description, image_url, created_by' : 'id, title, description, created_by';
      const { data, error } = await supabase
        .from(table as any)
        .select(cols)
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let owner = null;
      const d = data as any;
      if (d.created_by) {
        const { data: prof } = await supabase
          .from('public_profiles')
          .select('full_name, avatar_url')
          .eq('id', d.created_by)
          .maybeSingle();
        owner = prof;
      }
      setItem({
        id: d.id,
        title: d.title,
        description: d.description,
        image_url: d.image_url ?? null,
        created_by: d.created_by,
        owner,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [type, id, validType]);

  const dashboardUrl = `/dashboard?${type}=${id}`;

  // Auto-redirect logged-in users straight to the modal
  useEffect(() => {
    if (!authLoading && user && item) {
      navigate(dashboardUrl, { replace: true });
    }
  }, [authLoading, user, item, dashboardUrl, navigate]);

  if (!validType || !id) return <Navigate to="/" replace />;

  const typeLabel = {
    task: language === 'pt' ? 'Tarefa' : 'Task',
    poll: language === 'pt' ? 'Opinião' : 'Opinion',
    product: language === 'pt' ? 'Produto' : 'Product',
  }[type as ShareType];

  const TypeIcon = { task: ListTodo, poll: BarChart3, product: Package }[type as ShareType];

  const handlePrimary = () => {
    if (user) {
      navigate(dashboardUrl, { replace: true });
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(dashboardUrl)}`);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-lg font-medium mb-2">
          {language === 'pt' ? 'Item não encontrado' : 'Item not found'}
        </p>
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> {language === 'pt' ? 'Início' : 'Home'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg overflow-hidden shadow-xl">
        {item.image_url && (
          <div className="w-full h-52 bg-muted/30 flex items-center justify-center overflow-hidden">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-contain" />
          </div>
        )}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <TypeIcon className="w-4 h-4" />
            {typeLabel}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{item.title}</h1>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
              {item.description.replace(/<[^>]+>/g, '')}
            </p>
          )}
          {item.owner && (
            <div className="flex items-center gap-2 pt-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={item.owner.avatar_url || undefined} />
                <AvatarFallback>{item.owner.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {language === 'pt' ? 'Criado por' : 'Created by'}
                </span>{' '}
                <span className="font-medium">{item.owner.full_name || (language === 'pt' ? 'Usuário' : 'User')}</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            {!user && (
              <p className="text-sm text-muted-foreground text-center">
                {language === 'pt'
                  ? 'Entre ou crie sua conta no TaskMates para participar.'
                  : 'Sign in or create your TaskMates account to participate.'}
              </p>
            )}
            <Button onClick={handlePrimary} className="w-full gap-2" size="lg">
              {user ? (
                <>
                  {language === 'pt' ? 'Ver detalhes' : 'View details'}
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {language === 'pt' ? 'Entrar para participar' : 'Sign in to participate'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
