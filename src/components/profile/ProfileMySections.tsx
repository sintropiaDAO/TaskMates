import { useState, useEffect } from 'react';
import { ClipboardList, Target, TrendingUp, Truck, ShoppingCart, CheckCircle, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { PollDetailModal } from '@/components/polls/PollDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileVisibility, VisibilityKey } from '@/hooks/useProfileVisibility';
import { useHiddenCommunityTags, isVisibleItem } from '@/hooks/useHiddenCommunityFilter';
import { supabase } from '@/integrations/supabase/client';
import { Task, Product, Poll, Profile, Tag } from '@/types';
import { cn } from '@/lib/utils';
import { differenceInHours, differenceInMinutes, differenceInDays, isPast } from 'date-fns';

interface ProfileMySectionsProps {
  userId: string;
  isOwnProfile: boolean;
  onTaskClick?: (task: Task) => void;
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

// Product mini card - same design as Dashboard
function ProductCardMini({ product, onClick }: { product: Product; onClick: () => void }) {
  const isDelivered = product.status === 'delivered';
  const getTypeColor = () => product.product_type === 'offer' ? 'border-l-amber-500' : 'border-l-violet-500';

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/80 cursor-pointer transition-all border-l-4 ${getTypeColor()} ${isDelivered ? 'opacity-80' : ''}`}
    >
      <UserAvatar
        userId={product.created_by}
        name={product.creator?.full_name}
        avatarUrl={product.creator?.avatar_url}
        size="md"
        clickable={false}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate mb-0.5">
          {product.creator?.full_name || 'Usuário'}
        </p>
        <h4 className="font-medium text-sm line-clamp-1">{product.title}</h4>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
          {product.quantity}
        </span>
        {isDelivered && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
      </div>
    </div>
  );
}

// Poll mini card - same design as Dashboard
function PollCardMini({ poll, onClick }: { poll: Poll; onClick: () => void }) {
  const { language } = useLanguage();
  const isClosed = poll.status === 'closed';
  const totalVotes = poll.votes?.length || 0;
  const isExpired = poll.deadline ? isPast(new Date(poll.deadline)) : false;
  const [countdown, setCountdown] = useState('');
  const isEndingSoon = poll.deadline && !isExpired && !isClosed && differenceInHours(new Date(poll.deadline), new Date()) < 24;

  useEffect(() => {
    if (!poll.deadline || isExpired || isClosed) return;
    const computeCountdown = () => {
      const now = new Date();
      const end = new Date(poll.deadline!);
      if (isPast(end)) { setCountdown(language === 'pt' ? 'Encerrada' : 'Closed'); return; }
      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;
      if (days > 0) setCountdown(`${days}d ${hours}h`);
      else if (hours > 0) setCountdown(`${hours}h ${minutes}m`);
      else setCountdown(`${minutes}m`);
    };
    computeCountdown();
    const timer = setInterval(computeCountdown, 30000);
    return () => clearInterval(timer);
  }, [poll.deadline, isExpired, isClosed, language]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/80 cursor-pointer transition-all border-l-4 border-l-amber-500",
        isClosed && "opacity-80",
        isEndingSoon && "ring-1 ring-warning/50 bg-warning/5 border-l-warning"
      )}
    >
      <UserAvatar
        userId={poll.created_by}
        name={poll.creator?.full_name}
        avatarUrl={poll.creator?.avatar_url}
        size="md"
        clickable={false}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate mb-0.5">
          {poll.creator?.full_name || 'Usuário'}
        </p>
        <h4 className="font-medium text-sm line-clamp-1">{poll.title}</h4>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {poll.deadline && !isClosed && !isExpired && countdown && (
          <span className={cn(
            "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
            isEndingSoon ? "bg-warning/10 text-warning font-medium" : "bg-muted text-muted-foreground"
          )}>
            {countdown}
          </span>
        )}
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
          {totalVotes} {language === 'pt' ? 'votos' : 'votes'}
        </span>
        {isClosed && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  visibilityKey,
  isOwnProfile,
  settings,
  onHide,
  language,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  visibilityKey: VisibilityKey;
  isOwnProfile: boolean;
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

export function ProfileMySections({ userId, isOwnProfile, onTaskClick }: ProfileMySectionsProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { settings, toggleSection } = useProfileVisibility(userId);
  const { hiddenTagIds, loading: loadingHidden } = useHiddenCommunityTags();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [collaboratingTaskIds, setCollaboratingTaskIds] = useState<Set<string>>(new Set());
  const [requestingTaskIds, setRequestingTaskIds] = useState<Set<string>>(new Set());
  const [productParticipations, setProductParticipations] = useState<{ product_id: string; role: string }[]>([]);
  const [taskTagMap, setTaskTagMap] = useState<Record<string, Array<Pick<Tag, 'id' | 'category'>>>>({});
  const [productTagMap, setProductTagMap] = useState<Record<string, Array<Pick<Tag, 'id' | 'category'>>>>({});
  const [pollTagMap, setPollTagMap] = useState<Record<string, Array<Pick<Tag, 'id' | 'category'>>>>({});
  const [loading, setLoading] = useState(true);

  // Detail modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

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
      // Fetch profiles for creators
      const [tasksRes, productsRes, pollsRes, collabRes, participationsRes, taskTagsRes, productTagsRes, pollTagsRes] = await Promise.all([
        supabase.from('tasks').select('*').or(`created_by.eq.${userId}`),
        supabase.from('products').select('*').eq('created_by', userId),
        supabase.from('polls').select('id, title, description, image_url, deadline, allow_new_options, created_by, status, task_id, min_quorum, upvotes, downvotes, created_at, updated_at').eq('created_by', userId),
        supabase.from('task_collaborators').select('task_id, status').eq('user_id', userId).eq('approval_status', 'approved'),
        supabase.from('product_participants').select('product_id, role').eq('user_id', userId),
        supabase.from('task_tags').select('task_id, tag:tags(id, category)'),
        supabase.from('product_tags').select('product_id, tag:tags(id, category)'),
        supabase.from('poll_tags').select('poll_id, tag:tags(id, category)'),
      ]);

      // Build tag maps
      const ttMap: Record<string, Array<Pick<Tag, 'id' | 'category'>>> = {};
      (taskTagsRes.data || []).forEach((t: any) => {
        if (!ttMap[t.task_id]) ttMap[t.task_id] = [];
        if (t.tag) ttMap[t.task_id].push(t.tag);
      });
      setTaskTagMap(ttMap);

      const ptMap: Record<string, Array<Pick<Tag, 'id' | 'category'>>> = {};
      (productTagsRes.data || []).forEach((p: any) => {
        if (!ptMap[p.product_id]) ptMap[p.product_id] = [];
        if (p.tag) ptMap[p.product_id].push(p.tag);
      });
      setProductTagMap(ptMap);

      const plMap: Record<string, Array<Pick<Tag, 'id' | 'category'>>> = {};
      (pollTagsRes.data || []).forEach((p: any) => {
        if (!plMap[p.poll_id]) plMap[p.poll_id] = [];
        if (p.tag) plMap[p.poll_id].push(p.tag);
      });
      setPollTagMap(plMap);

      // Fetch creator profiles
      const allCreatorIds = new Set<string>();
      (tasksRes.data || []).forEach((t: any) => allCreatorIds.add(t.created_by));
      (productsRes.data || []).forEach((p: any) => allCreatorIds.add(p.created_by));
      (pollsRes.data || []).forEach((p: any) => allCreatorIds.add(p.created_by));

      let profileMap: Record<string, Profile> = {};
      if (allCreatorIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username, location, bio')
          .in('id', Array.from(allCreatorIds));
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.id, p as Profile]));
        }
      }

      // Fetch poll options and votes
      const pollIds = (pollsRes.data || []).map((p: any) => p.id);
      let pollOptionsMap: Record<string, any[]> = {};
      let pollVotesMap: Record<string, any[]> = {};
      if (pollIds.length > 0) {
        const [optRes, votRes] = await Promise.all([
          supabase.from('poll_options').select('*').in('poll_id', pollIds),
          supabase.from('poll_votes').select('*').in('poll_id', pollIds),
        ]);
        (optRes.data || []).forEach((o: any) => {
          if (!pollOptionsMap[o.poll_id]) pollOptionsMap[o.poll_id] = [];
          pollOptionsMap[o.poll_id].push(o);
        });
        (votRes.data || []).forEach((v: any) => {
          if (!pollVotesMap[v.poll_id]) pollVotesMap[v.poll_id] = [];
          pollVotesMap[v.poll_id].push(v);
        });
      }

      if (tasksRes.data) {
        setTasks(tasksRes.data.map((t: any) => ({ ...t, creator: profileMap[t.created_by] })));
      }
      if (productsRes.data) {
        setProducts(productsRes.data.map((p: any) => ({ ...p, creator: profileMap[p.created_by] })));
      }
      if (pollsRes.data) {
        setPolls(pollsRes.data.map((p: any) => ({
          ...p,
          creator: profileMap[p.created_by],
          options: pollOptionsMap[p.id] || [],
          votes: pollVotesMap[p.id] || [],
        })));
      }

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

  if (!hasAnyVisible || loading || loadingHidden) return null;

  // Filter helper
  const isTaskVisible = (t: Task) => isVisibleItem(taskTagMap[t.id] || [], hiddenTagIds);
  const isProductVisible = (p: Product) => isVisibleItem(productTagMap[p.id] || [], hiddenTagIds);
  const isPollVisible = (p: Poll) => isVisibleItem(pollTagMap[p.id] || [], hiddenTagIds);

  // Task sections
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const actionPlanTasks = openTasks.filter(t =>
    isTaskVisible(t) && (
      (t.created_by === userId && (t.task_type === 'offer' || t.task_type === 'personal')) ||
      (t.task_type === 'offer' && t.created_by !== userId && collaboratingTaskIds.has(t.id))
    )
  );
  const demandsTasks = openTasks.filter(t =>
    isTaskVisible(t) && (
      (t.created_by === userId && t.task_type === 'request') ||
      (t.task_type === 'offer' && t.created_by !== userId && requestingTaskIds.has(t.id))
    )
  );
  const impactTasks = tasks.filter(t =>
    isTaskVisible(t) &&
    t.status === 'completed' && (t.created_by === userId || collaboratingTaskIds.has(t.id) || requestingTaskIds.has(t.id))
  );

  // Product sections
  const myProducts = products.filter(p => p.created_by === userId);
  const deliverProducts = myProducts.filter(p => isProductVisible(p) && p.product_type === 'offer' && p.status !== 'delivered');
  const deliveredProducts = myProducts.filter(p => isProductVisible(p) && p.status === 'delivered');
  const supplierProductIds = new Set(productParticipations.filter(p => p.role === 'requester').map(p => p.product_id));
  const receiveProducts = products.filter(p => isProductVisible(p) && supplierProductIds.has(p.id) && p.status !== 'delivered');

  // Poll sections
  const votingPolls = polls.filter(p => isPollVisible(p) && p.status === 'active');
  const completedPolls = polls.filter(p => isPollVisible(p) && p.status === 'closed');

  const noItems = language === 'pt' ? 'Nenhum item' : 'No items';

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) onTaskClick(task);
  };

  const handlePollVote = async (pollId: string, optionId: string) => {
    await supabase.from('poll_votes').insert({ poll_id: pollId, option_id: optionId, user_id: user?.id || '' });
    return true;
  };

  return (
    <>
      {/* Action Plan */}
      <SectionCard icon={<ClipboardList className="w-5 h-5 text-emerald-500" />}
        title={language === 'pt' ? 'Plano de Ação' : 'Action Plan'}
        visibilityKey="show_my_action_plan" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {actionPlanTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {actionPlanTasks.slice(0, 5).map(t => (
              <TaskCardMini key={t.id} task={t} onClick={() => handleTaskClick(t)} />
            ))}
            {actionPlanTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{actionPlanTasks.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Demands */}
      <SectionCard icon={<Target className="w-5 h-5 text-pink-500" />}
        title={language === 'pt' ? 'Demandas' : 'Demands'}
        visibilityKey="show_my_demands" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {demandsTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {demandsTasks.slice(0, 5).map(t => (
              <TaskCardMini key={t.id} task={t} onClick={() => handleTaskClick(t)} />
            ))}
            {demandsTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{demandsTasks.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Impact */}
      <SectionCard icon={<TrendingUp className="w-5 h-5 text-primary" />}
        title={language === 'pt' ? 'Impacto' : 'Impact'}
        visibilityKey="show_my_impact" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {impactTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {impactTasks.slice(0, 5).map(t => (
              <TaskCardMini key={t.id} task={t} onClick={() => handleTaskClick(t)} />
            ))}
            {impactTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{impactTasks.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* To Deliver */}
      <SectionCard icon={<Truck className="w-5 h-5 text-emerald-500" />}
        title={language === 'pt' ? 'A Entregar' : 'To Deliver'}
        visibilityKey="show_my_deliver" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {deliverProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {deliverProducts.slice(0, 5).map(p => (
              <ProductCardMini key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
            ))}
            {deliverProducts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{deliverProducts.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* To Receive */}
      <SectionCard icon={<ShoppingCart className="w-5 h-5 text-pink-500" />}
        title={language === 'pt' ? 'A Receber' : 'To Receive'}
        visibilityKey="show_my_receive" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {receiveProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {receiveProducts.slice(0, 5).map(p => (
              <ProductCardMini key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
            ))}
            {receiveProducts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{receiveProducts.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Delivered */}
      <SectionCard icon={<CheckCircle className="w-5 h-5 text-primary" />}
        title={language === 'pt' ? 'Entregues' : 'Delivered'}
        visibilityKey="show_my_delivered" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {deliveredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {deliveredProducts.slice(0, 5).map(p => (
              <ProductCardMini key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
            ))}
            {deliveredProducts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{deliveredProducts.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Voting */}
      <SectionCard icon={<BarChart3 className="w-5 h-5 text-amber-500" />}
        title={language === 'pt' ? 'Em Votação' : 'Voting'}
        visibilityKey="show_my_voting" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {votingPolls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {votingPolls.slice(0, 5).map(p => (
              <PollCardMini key={p.id} poll={p} onClick={() => setSelectedPoll(p)} />
            ))}
            {votingPolls.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{votingPolls.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Completed Polls */}
      <SectionCard icon={<CheckCircle className="w-5 h-5 text-primary" />}
        title={language === 'pt' ? 'Enquetes Concluídas' : 'Completed Polls'}
        visibilityKey="show_my_completed_polls" isOwnProfile={isOwnProfile}
        settings={settings} onHide={handleHide} language={language}>
        {completedPolls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{noItems}</p>
        ) : (
          <div className="space-y-2">
            {completedPolls.slice(0, 5).map(p => (
              <PollCardMini key={p.id} poll={p} onClick={() => setSelectedPoll(p)} />
            ))}
            {completedPolls.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{completedPolls.length - 5}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Poll Detail Modal */}
      <PollDetailModal
        poll={selectedPoll}
        open={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
        onVote={handlePollVote}
      />
    </>
  );
}
