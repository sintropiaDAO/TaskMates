import { useState, useEffect } from 'react';
import { ClipboardList, Target, TrendingUp, Truck, ShoppingCart, CheckCircle, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileVisibility, VisibilityKey } from '@/hooks/useProfileVisibility';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface ProfileMySectionsProps {
  userId: string;
  isOwnProfile: boolean;
}

interface SimpleTask {
  id: string;
  title: string;
  task_type: string;
  status: string;
  created_by: string;
  deadline: string | null;
  updated_at: string | null;
}

interface SimpleProduct {
  id: string;
  title: string;
  product_type: string;
  status: string;
  created_by: string;
  quantity: number;
}

interface SimplePoll {
  id: string;
  title: string;
  status: string;
  created_by: string;
  deadline: string | null;
}

function HideButton({ onHide, language }: { onHide: () => void; language: string }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onHide} className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive">
            <EyeOff className="w-3.5 h-3.5" />
            {language === 'pt' ? 'Ocultar' : 'Hide'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{language === 'pt' ? 'Ocultar do perfil público' : 'Hide from public profile'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ItemList({ items, emptyText }: { items: { id: string; title: string; subtitle?: string }[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-3">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 5).map(item => (
        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
          <p className="text-sm font-medium truncate flex-1">{item.title}</p>
          {item.subtitle && <span className="text-xs text-muted-foreground whitespace-nowrap">{item.subtitle}</span>}
        </div>
      ))}
      {items.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">+{items.length - 5} {items.length - 5 === 1 ? 'item' : 'itens'}</p>
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  visibilityKey,
  isOwnProfile,
  userId,
  settings,
  onHide,
  language,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  visibilityKey: VisibilityKey;
  isOwnProfile: boolean;
  userId: string;
  settings: Record<string, boolean>;
  onHide: (key: VisibilityKey) => void;
  language: string;
  children: React.ReactNode;
}) {
  if (!settings[visibilityKey]) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-lg">{title}</span>
        </div>
        {isOwnProfile && <HideButton onHide={() => onHide(visibilityKey)} language={language} />}
      </div>
      {children}
    </motion.div>
  );
}

export function ProfileMySections({ userId, isOwnProfile }: ProfileMySectionsProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { settings, toggleSection } = useProfileVisibility(userId);

  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [polls, setPolls] = useState<SimplePoll[]>([]);
  const [collaboratingTaskIds, setCollaboratingTaskIds] = useState<Set<string>>(new Set());
  const [requestingTaskIds, setRequestingTaskIds] = useState<Set<string>>(new Set());
  const [productParticipations, setProductParticipations] = useState<{ product_id: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const hasAnyVisible = settings.show_my_action_plan || settings.show_my_demands || settings.show_my_impact ||
    settings.show_my_deliver || settings.show_my_receive || settings.show_my_delivered ||
    settings.show_my_voting || settings.show_my_completed_polls;

  useEffect(() => {
    if (!hasAnyVisible) { setLoading(false); return; }
    fetchData();
  }, [userId, hasAnyVisible]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, productsRes, pollsRes, collabRes, participationsRes] = await Promise.all([
        supabase.from('tasks').select('id, title, task_type, status, created_by, deadline, updated_at').or(`created_by.eq.${userId}`),
        supabase.from('products').select('id, title, product_type, status, created_by, quantity').eq('created_by', userId),
        supabase.from('polls').select('id, title, status, created_by, deadline').eq('created_by', userId),
        supabase.from('task_collaborators').select('task_id, status').eq('user_id', userId).eq('approval_status', 'approved'),
        supabase.from('product_participants').select('product_id, role').eq('user_id', userId),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (pollsRes.data) setPolls(pollsRes.data);
      if (collabRes.data) {
        const collabIds = new Set<string>();
        const reqIds = new Set<string>();
        collabRes.data.forEach((c: any) => {
          if (c.status === 'collaborate') collabIds.add(c.task_id);
          else if (c.status === 'request') reqIds.add(c.task_id);
        });
        setCollaboratingTaskIds(collabIds);
        setRequestingTaskIds(reqIds);
      }
      if (participationsRes.data) setProductParticipations(participationsRes.data);
    } catch (err) {
      console.error('Error fetching profile sections data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = (key: VisibilityKey) => {
    if (isOwnProfile && user?.id === userId) {
      toggleSection(key, false);
    }
  };

  if (!hasAnyVisible || loading) return null;

  // Task sections
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const actionPlanTasks = openTasks.filter(t =>
    (t.created_by === userId && (t.task_type === 'offer' || t.task_type === 'personal')) ||
    (t.task_type === 'offer' && t.created_by !== userId && collaboratingTaskIds.has(t.id))
  );
  const demandsTasks = openTasks.filter(t =>
    (t.created_by === userId && t.task_type === 'request') ||
    (t.task_type === 'offer' && t.created_by !== userId && requestingTaskIds.has(t.id))
  );
  const impactTasks = tasks.filter(t =>
    t.status === 'completed' && (t.created_by === userId || collaboratingTaskIds.has(t.id) || requestingTaskIds.has(t.id))
  );

  // Product sections
  const myProducts = products.filter(p => p.created_by === userId);
  const deliverProducts = myProducts.filter(p => p.product_type === 'offer' && p.status !== 'delivered');
  const deliveredProducts = myProducts.filter(p => p.status === 'delivered');
  const supplierProductIds = new Set(productParticipations.filter(p => p.role === 'requester').map(p => p.product_id));
  const receiveProducts = products.filter(p => supplierProductIds.has(p.id) && p.status !== 'delivered');

  // Poll sections
  const votingPolls = polls.filter(p => p.status === 'active');
  const completedPolls = polls.filter(p => p.status === 'closed');

  const getTypeLabel = (type: string) => {
    if (type === 'offer') return language === 'pt' ? 'Oferta' : 'Offer';
    if (type === 'request') return language === 'pt' ? 'Solicitação' : 'Request';
    return language === 'pt' ? 'Pessoal' : 'Personal';
  };

  const noItems = language === 'pt' ? 'Nenhum item' : 'No items';

  return (
    <>
      <SectionCard icon={<ClipboardList className="w-5 h-5 text-emerald-500" />}
        title={language === 'pt' ? 'Plano de Ação' : 'Action Plan'}
        visibilityKey="show_my_action_plan" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={actionPlanTasks.map(t => ({ id: t.id, title: t.title, subtitle: getTypeLabel(t.task_type) }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<Target className="w-5 h-5 text-pink-500" />}
        title={language === 'pt' ? 'Demandas' : 'Demands'}
        visibilityKey="show_my_demands" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={demandsTasks.map(t => ({ id: t.id, title: t.title, subtitle: getTypeLabel(t.task_type) }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<TrendingUp className="w-5 h-5 text-primary" />}
        title={language === 'pt' ? 'Impacto' : 'Impact'}
        visibilityKey="show_my_impact" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={impactTasks.map(t => ({ id: t.id, title: t.title, subtitle: getTypeLabel(t.task_type) }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<Truck className="w-5 h-5 text-emerald-500" />}
        title={language === 'pt' ? 'A Entregar' : 'To Deliver'}
        visibilityKey="show_my_deliver" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={deliverProducts.map(p => ({ id: p.id, title: p.title, subtitle: `${p.quantity}x` }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<ShoppingCart className="w-5 h-5 text-pink-500" />}
        title={language === 'pt' ? 'A Receber' : 'To Receive'}
        visibilityKey="show_my_receive" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={receiveProducts.map(p => ({ id: p.id, title: p.title }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<CheckCircle className="w-5 h-5 text-primary" />}
        title={language === 'pt' ? 'Entregues' : 'Delivered'}
        visibilityKey="show_my_delivered" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={deliveredProducts.map(p => ({ id: p.id, title: p.title }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<BarChart3 className="w-5 h-5 text-amber-500" />}
        title={language === 'pt' ? 'Em Votação' : 'Voting'}
        visibilityKey="show_my_voting" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={votingPolls.map(p => ({ id: p.id, title: p.title }))} emptyText={noItems} />
      </SectionCard>

      <SectionCard icon={<CheckCircle className="w-5 h-5 text-primary" />}
        title={language === 'pt' ? 'Enquetes Concluídas' : 'Completed Polls'}
        visibilityKey="show_my_completed_polls" isOwnProfile={isOwnProfile} userId={userId}
        settings={settings} onHide={handleHide} language={language}>
        <ItemList items={completedPolls.map(p => ({ id: p.id, title: p.title }))} emptyText={noItems} />
      </SectionCard>
    </>
  );
}
