import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Package, BarChart3, CheckCircle, Image as ImageIcon, Users, Filter, Sparkles, ClipboardList, BadgeCheck, AlertTriangle, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TagBadge } from '@/components/ui/tag-badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { UserAvatar } from '@/components/common/UserAvatar';
import { StarRating } from '@/components/ui/star-rating';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { FeedCardActions } from './FeedCardActions';
import { FeedFeedbackModal } from './FeedFeedbackModal';

type FeedFilter = 'all' | 'tasks' | 'products' | 'polls';

interface FeedItem {
  id: string;
  type: 'task' | 'product' | 'poll';
  title: string;
  description: string | null;
  imageUrl: string | null;
  proofUrl: string | null;
  proofType: string | null;
  status: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userVerified?: boolean;
  tags: { id: string; name: string; category: string }[];
  createdAt: string;
  completedAt: string;
  taskType?: string;
  productType?: string;
  pollOptions?: { label: string; votes: number }[];
  totalVotes?: number;
  averageRating?: number;
  ratingCount?: number;
  location?: string | null;
  priority?: string | null;
}

interface ActivityFeedProps {
  followingIds: string[];
  currentUserId?: string;
  onTaskClick?: (taskId: string) => void;
  onProductClick?: (productId: string) => void;
  onPollClick?: (pollId: string) => void;
}

export function ActivityFeed({ followingIds, currentUserId, onTaskClick, onProductClick, onPollClick }: ActivityFeedProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { getTranslatedName } = useTags();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; title: string } | null>(null);

  const dateLocale = language === 'pt' ? pt : enUS;

  useEffect(() => {
    const allUserIds = currentUserId 
      ? [...new Set([...followingIds, currentUserId])]
      : followingIds;

    if (allUserIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const fetchFeedItems = async () => {
      setLoading(true);
      const feedItems: FeedItem[] = [];

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allUserIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Also get user_tags to know what tags the current user follows
      let userTagIds: string[] = [];
      if (currentUserId) {
        const { data: ut } = await supabase
          .from('user_tags')
          .select('tag_id')
          .eq('user_id', currentUserId);
        userTagIds = ut?.map(u => u.tag_id) || [];
      }

      // 1. Fetch completed tasks from followed users + personal completed tasks from friends
      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('id, title, description, status, task_type, created_by, image_url, completion_proof_url, completion_proof_type, created_at, updated_at')
        .in('created_by', allUserIds)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(30);

      if (completedTasks) {
        // Fetch tags for these tasks
        const taskIds = completedTasks.map(t => t.id);
        const { data: taskTagsData } = await supabase
          .from('task_tags')
          .select('task_id, tag:tags(id, name, category)')
          .in('task_id', taskIds);

        const taskTagsMap: Record<string, any[]> = {};
        taskTagsData?.forEach((tt: any) => {
          if (!taskTagsMap[tt.task_id]) taskTagsMap[tt.task_id] = [];
          if (tt.tag) taskTagsMap[tt.task_id].push(tt.tag);
        });

        // Fetch additional completion proofs (first proof image for each task)
        const { data: proofs } = await supabase
          .from('task_completion_proofs')
          .select('task_id, proof_url, proof_type')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true });

        const proofMap: Record<string, { url: string; type: string }> = {};
        proofs?.forEach(p => {
          if (!proofMap[p.task_id]) {
            proofMap[p.task_id] = { url: p.proof_url, type: p.proof_type };
          }
        });

        for (const task of completedTasks) {
          // Include if: from a followed user, OR personal task from a friend (not current user's own personal tasks in feed)
          const isOwnTask = task.created_by === currentUserId;
          const isPersonalFromFriend = task.task_type === 'personal' && !isOwnTask && followingIds.includes(task.created_by);
          const isNonPersonalFromFollowed = task.task_type !== 'personal' && (followingIds.includes(task.created_by) || isOwnTask);
          
          if (!isNonPersonalFromFollowed && !isPersonalFromFriend) continue;

          const profile = profileMap.get(task.created_by);
          if (!profile) continue;

          const proofData = proofMap[task.id];
          const heroImage = task.completion_proof_url || proofData?.url || task.image_url;
          const heroType = task.completion_proof_type || proofData?.type || null;

          feedItems.push({
            id: `task-${task.id}`,
            type: 'task',
            title: task.title,
            description: task.description,
            imageUrl: task.image_url,
            proofUrl: heroImage,
            proofType: heroType,
            status: task.status || 'completed',
            userId: task.created_by,
            userName: profile.full_name || t('user'),
            userAvatar: profile.avatar_url,
            tags: taskTagsMap[task.id] || [],
            createdAt: task.created_at || '',
            completedAt: task.updated_at || task.created_at || '',
            taskType: task.task_type,
          });
        }
      }

      // 2. Fetch delivered products
      const { data: deliveredProducts } = await supabase
        .from('products')
        .select('id, title, description, product_type, status, created_by, image_url, created_at, updated_at')
        .in('created_by', allUserIds)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (deliveredProducts) {
        const productIds = deliveredProducts.map(p => p.id);
        
        // Fetch tags
        const { data: productTagsData } = await supabase
          .from('product_tags')
          .select('product_id, tag:tags(id, name, category)')
          .in('product_id', productIds);

        const productTagsMap: Record<string, any[]> = {};
        productTagsData?.forEach((pt: any) => {
          if (!productTagsMap[pt.product_id]) productTagsMap[pt.product_id] = [];
          if (pt.tag) productTagsMap[pt.product_id].push(pt.tag);
        });

        // Fetch delivery proofs
        const { data: participants } = await supabase
          .from('product_participants')
          .select('product_id, delivery_proof_url, delivery_proof_type')
          .in('product_id', productIds)
          .eq('delivery_confirmed', true)
          .not('delivery_proof_url', 'is', null);

        const deliveryProofMap: Record<string, { url: string; type: string }> = {};
        participants?.forEach(p => {
          if (!deliveryProofMap[p.product_id] && p.delivery_proof_url) {
            deliveryProofMap[p.product_id] = { url: p.delivery_proof_url, type: p.delivery_proof_type || 'image' };
          }
        });

        for (const product of deliveredProducts) {
          const profile = profileMap.get(product.created_by);
          if (!profile) continue;

          const deliveryProof = deliveryProofMap[product.id];

          feedItems.push({
            id: `product-${product.id}`,
            type: 'product',
            title: product.title,
            description: product.description,
            imageUrl: product.image_url,
            proofUrl: deliveryProof?.url || product.image_url,
            proofType: deliveryProof?.type || null,
            status: 'delivered',
            userId: product.created_by,
            userName: profile.full_name || t('user'),
            userAvatar: profile.avatar_url,
            tags: productTagsMap[product.id] || [],
            createdAt: product.created_at,
            completedAt: product.updated_at || product.created_at,
            productType: product.product_type,
          });
        }
      }

      // 3. Fetch closed polls
      const { data: closedPolls } = await supabase
        .from('polls')
        .select('id, title, description, status, created_by, created_at, updated_at')
        .in('created_by', allUserIds)
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (closedPolls) {
        const pollIds = closedPolls.map(p => p.id);

        // Fetch tags
        const { data: pollTagsData } = await supabase
          .from('poll_tags')
          .select('poll_id, tag:tags(id, name, category)')
          .in('poll_id', pollIds);

        const pollTagsMap: Record<string, any[]> = {};
        pollTagsData?.forEach((pt: any) => {
          if (!pollTagsMap[pt.poll_id]) pollTagsMap[pt.poll_id] = [];
          if (pt.tag) pollTagsMap[pt.poll_id].push(pt.tag);
        });

        // Fetch options and votes for result display
        const { data: options } = await supabase
          .from('poll_options')
          .select('id, poll_id, label')
          .in('poll_id', pollIds);

        const { data: votes } = await supabase
          .from('poll_votes')
          .select('poll_id, option_id')
          .in('poll_id', pollIds);

        const optionsByPoll: Record<string, { id: string; label: string; votes: number }[]> = {};
        options?.forEach(o => {
          if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
          const voteCount = votes?.filter(v => v.option_id === o.id).length || 0;
          optionsByPoll[o.poll_id].push({ id: o.id, label: o.label, votes: voteCount });
        });

        for (const poll of closedPolls) {
          const profile = profileMap.get(poll.created_by);
          if (!profile) continue;

          const pollOpts = optionsByPoll[poll.id] || [];
          const totalVotes = pollOpts.reduce((sum, o) => sum + o.votes, 0);
          const sortedOpts = [...pollOpts].sort((a, b) => b.votes - a.votes).slice(0, 3);

          feedItems.push({
            id: `poll-${poll.id}`,
            type: 'poll',
            title: poll.title,
            description: poll.description,
            imageUrl: null,
            proofUrl: null,
            proofType: null,
            status: 'closed',
            userId: poll.created_by,
            userName: profile.full_name || t('user'),
            userAvatar: profile.avatar_url,
            tags: pollTagsMap[poll.id] || [],
            createdAt: poll.created_at,
            completedAt: poll.updated_at || poll.created_at,
            pollOptions: sortedOpts.map(o => ({ label: o.label, votes: o.votes })),
            totalVotes,
          });
        }
      }

      // Sort all by completedAt desc
      feedItems.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

      setItems(feedItems);
      setLoading(false);
    };

    fetchFeedItems();
  }, [followingIds, currentUserId, t]);

  const filterTypeMap: Record<FeedFilter, string> = { all: 'all', tasks: 'task', products: 'product', polls: 'poll' };
  const finalItems = filter === 'all' ? items : items.filter(i => i.type === filterTypeMap[filter]);

  const filters: { key: FeedFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: language === 'pt' ? 'Todos' : 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Enquetes' : 'Polls', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  if (followingIds.length === 0 && !currentUserId) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('activityNoFollowing')}</h3>
        <p className="text-muted-foreground">{t('activityNoFollowingDescription')}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {language === 'pt' ? 'Nenhuma conquista recente' : 'No recent achievements'}
        </h3>
        <p className="text-muted-foreground">
          {language === 'pt' 
            ? 'As tarefas concluídas, produtos entregues e enquetes finalizadas aparecerão aqui.' 
            : 'Completed tasks, delivered products and closed polls will appear here.'}
        </p>
      </div>
    );
  }

  const getStatusBadge = (item: FeedItem) => {
    if (item.type === 'task') {
      const label = item.taskType === 'personal' 
        ? (language === 'pt' ? '🎯 Meta pessoal' : '🎯 Personal goal')
        : item.taskType === 'offer' 
        ? (language === 'pt' ? '✅ Oferta concluída' : '✅ Offer completed')
        : (language === 'pt' ? '✅ Demanda atendida' : '✅ Request fulfilled');
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300 shadow-sm backdrop-blur-sm">{label}</span>;
    }
    if (item.type === 'product') {
      const label = language === 'pt' ? '📦 Entregue' : '📦 Delivered';
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300 shadow-sm backdrop-blur-sm">{label}</span>;
    }
    if (item.type === 'poll') {
      const label = language === 'pt' ? '📊 Concluída' : '📊 Closed';
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/80 dark:text-violet-300 shadow-sm backdrop-blur-sm">{label}</span>;
    }
    return null;
  };

  const handleItemClick = (item: FeedItem) => {
    const rawId = item.id.replace(/^(task|product|poll)-/, '');
    if (item.type === 'task') onTaskClick?.(rawId);
    else if (item.type === 'product') onProductClick?.(rawId);
    else if (item.type === 'poll') onPollClick?.(rawId);
  };

  const isImageProof = (item: FeedItem) => {
    if (!item.proofUrl) return false;
    const type = item.proofType?.toLowerCase() || '';
    return type.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.proofUrl);
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="grid grid-cols-4 gap-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.icon}
            <span className="truncate">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Feed grid - same style as Para Você */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {finalItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border-border/50"
              onClick={() => handleItemClick(item)}
            >
              {/* Hero image from proof */}
              {isImageProof(item) && item.proofUrl && (
                <div className="relative">
                  <AspectRatio ratio={16 / 9}>
                    <img
                      src={item.proofUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </AspectRatio>
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(item)}
                  </div>
                </div>
              )}

              <CardContent className={`${isImageProof(item) && item.proofUrl ? 'p-3' : 'p-4'}`}>
                {/* Status badge if no image */}
                {(!isImageProof(item) || !item.proofUrl) && (
                  <div className="mb-2">{getStatusBadge(item)}</div>
                )}

                {/* Title */}
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">{item.title}</h3>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                )}

                {/* Poll results mini chart */}
                {item.type === 'poll' && item.pollOptions && item.totalVotes && item.totalVotes > 0 && (
                  <div className="space-y-1 mb-2">
                    {item.pollOptions.map((opt, i) => {
                      const pct = Math.round((opt.votes / item.totalVotes!) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <span className="truncate flex-1 text-muted-foreground">{opt.label}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${i === 0 ? 'bg-primary' : 'bg-primary/40'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground">
                      {item.totalVotes} {language === 'pt' ? 'votos' : 'votes'}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.slice(0, 3).map(tag => (
                      <TagBadge
                        key={tag.id}
                        name={tag.name}
                        displayName={getTranslatedName(tag as any)}
                        category={tag.category as any}
                        size="sm"
                      />
                    ))}
                  </div>
                )}

                {/* Author + time */}
                <div className="flex items-center gap-2 mt-auto pt-1 border-t border-border/30">
                  <Avatar 
                    className="w-6 h-6 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.userId}`); }}
                  >
                    <AvatarImage src={item.userAvatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {item.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span 
                    className="text-xs font-medium truncate cursor-pointer hover:underline"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${item.userId}`); }}
                  >
                    {item.userName}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.completedAt), {
                      addSuffix: true,
                      locale: dateLocale
                    })}
                  </span>
                </div>

                {/* Actions: like/dislike, clap, feedback */}
                <FeedCardActions
                  itemId={item.id.replace(/^(task|product|poll)-/, '')}
                  itemType={item.type}
                  onFeedbackClick={() => setFeedbackTarget({ id: item.id.replace(/^(task|product|poll)-/, ''), title: item.title })}
                />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {finalItems.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {language === 'pt' ? 'Nenhum item nesta categoria' : 'No items in this category'}
          </h3>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedFeedbackModal
        open={!!feedbackTarget}
        onOpenChange={(open) => !open && setFeedbackTarget(null)}
        taskId={feedbackTarget?.id || ''}
        taskTitle={feedbackTarget?.title || ''}
      />
    </div>
  );
}
