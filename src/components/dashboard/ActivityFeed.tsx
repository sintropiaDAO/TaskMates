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

      // Parallel: fetch profiles, user tags, and all three content types at once
      const [profilesResult, userTagsResult, completedTasksResult, deliveredProductsResult, allPollsResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', allUserIds),
        currentUserId 
          ? supabase.from('user_tags').select('tag_id').eq('user_id', currentUserId)
          : Promise.resolve({ data: null }),
        supabase.from('tasks')
          .select('id, title, description, status, task_type, created_by, image_url, completion_proof_url, completion_proof_type, created_at, updated_at, location, priority')
          .in('created_by', allUserIds).eq('status', 'completed')
          .order('updated_at', { ascending: false }).limit(30),
        supabase.from('products')
          .select('id, title, description, product_type, status, created_by, image_url, created_at, updated_at, location, priority')
          .in('created_by', allUserIds).eq('status', 'delivered')
          .order('updated_at', { ascending: false }).limit(20),
        supabase.from('polls')
          .select('id, title, description, status, created_by, created_at, updated_at, deadline')
          .in('created_by', allUserIds)
          .order('updated_at', { ascending: false }).limit(50),
      ]);

      const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
      const userTagIds = userTagsResult.data?.map(u => u.tag_id) || [];

      const completedTasks = completedTasksResult.data || [];
      const deliveredProducts = deliveredProductsResult.data || [];
      const closedPolls = (allPollsResult.data || [])
        .filter(p => p.status === 'closed' || (p.deadline && new Date(p.deadline) < new Date()))
        .slice(0, 20);

      // Collect all IDs for batch queries
      const taskIds = completedTasks.map(t => t.id);
      const productIds = deliveredProducts.map(p => p.id);
      const pollIds = closedPolls.map(p => p.id);

      // Parallel: fetch all related data for tasks, products, and polls at once
      const [
        taskTagsResult, proofsResult, ratingsResult,
        productTagsResult, participantsResult, productRatingsResult,
        pollTagsResult, pollOptionsResult, pollVotesResult
      ] = await Promise.all([
        // Task-related
        taskIds.length > 0
          ? supabase.from('task_tags').select('task_id, tag:tags(id, name, category)').in('task_id', taskIds)
          : Promise.resolve({ data: null }),
        taskIds.length > 0
          ? supabase.from('task_completion_proofs').select('task_id, proof_url, proof_type').in('task_id', taskIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: null }),
        taskIds.length > 0
          ? supabase.from('task_ratings').select('task_id, rating').in('task_id', taskIds)
          : Promise.resolve({ data: null }),
        // Product-related
        productIds.length > 0
          ? supabase.from('product_tags').select('product_id, tag:tags(id, name, category)').in('product_id', productIds)
          : Promise.resolve({ data: null }),
        productIds.length > 0
          ? supabase.from('product_participants').select('product_id, delivery_proof_url, delivery_proof_type').in('product_id', productIds).eq('delivery_confirmed', true).not('delivery_proof_url', 'is', null)
          : Promise.resolve({ data: null }),
        productIds.length > 0
          ? supabase.from('product_ratings').select('product_id, rating').in('product_id', productIds)
          : Promise.resolve({ data: null }),
        // Poll-related
        pollIds.length > 0
          ? supabase.from('poll_tags').select('poll_id, tag:tags(id, name, category)').in('poll_id', pollIds)
          : Promise.resolve({ data: null }),
        pollIds.length > 0
          ? supabase.from('poll_options').select('id, poll_id, label').in('poll_id', pollIds)
          : Promise.resolve({ data: null }),
        pollIds.length > 0
          ? supabase.from('poll_votes').select('poll_id, option_id').in('poll_id', pollIds)
          : Promise.resolve({ data: null }),
      ]);

      // Process tasks
      if (completedTasks.length > 0) {
        const taskTagsMap: Record<string, any[]> = {};
        taskTagsResult.data?.forEach((tt: any) => {
          if (!taskTagsMap[tt.task_id]) taskTagsMap[tt.task_id] = [];
          if (tt.tag) taskTagsMap[tt.task_id].push(tt.tag);
        });

        const proofMap: Record<string, { url: string; type: string }> = {};
        proofsResult.data?.forEach(p => {
          if (!proofMap[p.task_id]) proofMap[p.task_id] = { url: p.proof_url, type: p.proof_type };
        });

        const ratingsByTask: Record<string, number[]> = {};
        ratingsResult.data?.forEach(r => {
          if (!ratingsByTask[r.task_id]) ratingsByTask[r.task_id] = [];
          ratingsByTask[r.task_id].push(r.rating);
        });

        for (const task of completedTasks) {
          const isOwnTask = task.created_by === currentUserId;
          const isPersonalFromFriend = task.task_type === 'personal' && !isOwnTask && followingIds.includes(task.created_by);
          const isNonPersonalFromFollowed = task.task_type !== 'personal' && (followingIds.includes(task.created_by) || isOwnTask);
          if (!isNonPersonalFromFollowed && !isPersonalFromFriend) continue;

          const profile = profileMap.get(task.created_by);
          if (!profile) continue;

          const proofData = proofMap[task.id];
          const heroImage = task.completion_proof_url || proofData?.url || task.image_url;
          const heroType = task.completion_proof_type || proofData?.type || null;
          const taskRatings = ratingsByTask[task.id] || [];
          const avgRating = taskRatings.length > 0 ? taskRatings.reduce((a, b) => a + b, 0) / taskRatings.length : 0;

          feedItems.push({
            id: `task-${task.id}`, type: 'task', title: task.title, description: task.description,
            imageUrl: task.image_url, proofUrl: heroImage, proofType: heroType,
            status: task.status || 'completed', userId: task.created_by,
            userName: profile.full_name || t('user'), userAvatar: profile.avatar_url,
            userVerified: (profile as any).is_verified || false,
            tags: taskTagsMap[task.id] || [], createdAt: task.created_at || '',
            completedAt: task.updated_at || task.created_at || '', taskType: task.task_type,
            averageRating: avgRating, ratingCount: taskRatings.length,
            location: (task as any).location, priority: (task as any).priority,
          });
        }
      }

      // Process products
      if (deliveredProducts.length > 0) {
        const productTagsMap: Record<string, any[]> = {};
        productTagsResult.data?.forEach((pt: any) => {
          if (!productTagsMap[pt.product_id]) productTagsMap[pt.product_id] = [];
          if (pt.tag) productTagsMap[pt.product_id].push(pt.tag);
        });

        const deliveryProofMap: Record<string, { url: string; type: string }> = {};
        participantsResult.data?.forEach(p => {
          if (!deliveryProofMap[p.product_id] && p.delivery_proof_url) {
            deliveryProofMap[p.product_id] = { url: p.delivery_proof_url, type: p.delivery_proof_type || 'image' };
          }
        });

        const productRatingsMap: Record<string, number[]> = {};
        productRatingsResult.data?.forEach((r: any) => {
          if (!productRatingsMap[r.product_id]) productRatingsMap[r.product_id] = [];
          productRatingsMap[r.product_id].push(r.rating);
        });

        for (const product of deliveredProducts) {
          const profile = profileMap.get(product.created_by);
          if (!profile) continue;

          const deliveryProof = deliveryProofMap[product.id];
          const pRatings = productRatingsMap[product.id] || [];
          const avgRating = pRatings.length > 0 ? pRatings.reduce((a, b) => a + b, 0) / pRatings.length : 0;

          feedItems.push({
            id: `product-${product.id}`, type: 'product', title: product.title,
            description: product.description, imageUrl: product.image_url,
            proofUrl: deliveryProof?.url || product.image_url, proofType: deliveryProof?.type || null,
            status: 'delivered', userId: product.created_by,
            userName: profile.full_name || t('user'), userAvatar: profile.avatar_url,
            userVerified: (profile as any).is_verified || false,
            tags: productTagsMap[product.id] || [], createdAt: product.created_at,
            completedAt: product.updated_at || product.created_at, productType: product.product_type,
            averageRating: avgRating, ratingCount: pRatings.length,
            location: product.location, priority: product.priority,
          });
        }
      }

      // Process polls
      if (closedPolls.length > 0) {
        const pollTagsMap: Record<string, any[]> = {};
        pollTagsResult.data?.forEach((pt: any) => {
          if (!pollTagsMap[pt.poll_id]) pollTagsMap[pt.poll_id] = [];
          if (pt.tag) pollTagsMap[pt.poll_id].push(pt.tag);
        });

        const optionsByPoll: Record<string, { id: string; label: string; votes: number }[]> = {};
        pollOptionsResult.data?.forEach(o => {
          if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
          const voteCount = pollVotesResult.data?.filter(v => v.option_id === o.id).length || 0;
          optionsByPoll[o.poll_id].push({ id: o.id, label: o.label, votes: voteCount });
        });

        for (const poll of closedPolls) {
          const profile = profileMap.get(poll.created_by);
          if (!profile) continue;

          const pollOpts = optionsByPoll[poll.id] || [];
          const totalVotes = pollOpts.reduce((sum, o) => sum + o.votes, 0);
          const sortedOpts = [...pollOpts].sort((a, b) => b.votes - a.votes).slice(0, 3);

          feedItems.push({
            id: `poll-${poll.id}`, type: 'poll', title: poll.title,
            description: poll.description, imageUrl: null, proofUrl: null, proofType: null,
            status: 'closed', userId: poll.created_by,
            userName: profile.full_name || t('user'), userAvatar: profile.avatar_url,
            userVerified: (profile as any).is_verified || false,
            tags: pollTagsMap[poll.id] || [], createdAt: poll.created_at,
            completedAt: poll.updated_at || poll.created_at,
            pollOptions: sortedOpts.map(o => ({ label: o.label, votes: o.votes })),
            totalVotes,
          });
        }
      }

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

  const getTypeBadges = (item: FeedItem) => {
    const badges: React.ReactNode[] = [];
    
    if (item.priority === 'high') {
      badges.push(
        <span key="priority" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {language === 'pt' ? 'Alta' : 'High'}
        </span>
      );
    }

    if (item.type === 'task') {
      badges.push(
        <span key="completed" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
          <CheckCircle className="w-3 h-3 flex-shrink-0" />
          {language === 'pt' ? 'Concluída' : 'Completed'}
        </span>
      );
      const typeStyle = item.taskType === 'offer' ? 'bg-success/10 text-success' 
        : item.taskType === 'request' ? 'bg-pink-600/10 text-pink-600' 
        : 'bg-info/10 text-info';
      const typeLabel = item.taskType === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer')
        : item.taskType === 'request' ? (language === 'pt' ? 'Solicitação' : 'Request')
        : (language === 'pt' ? 'Pessoal' : 'Personal');
      badges.push(<span key="type" className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeStyle}`}>{typeLabel}</span>);
    } else if (item.type === 'product') {
      badges.push(
        <span key="pkg" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
          <Package className="w-3 h-3" />
          {language === 'pt' ? 'Produto' : 'Product'}
        </span>
      );
      badges.push(
        <span key="delivered" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          <CheckCircle className="w-3 h-3" />
          {language === 'pt' ? 'Entregue' : 'Delivered'}
        </span>
      );
      const prodTypeStyle = item.productType === 'offer' ? 'bg-amber-500/10 text-amber-500' : 'bg-violet-500/10 text-violet-500';
      const prodTypeLabel = item.productType === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request');
      badges.push(<span key="prodType" className={`px-2 py-1 rounded-full text-xs font-medium ${prodTypeStyle}`}>{prodTypeLabel}</span>);
    } else if (item.type === 'poll') {
      badges.push(
        <span key="poll" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-info/10 text-info">
          <BarChart3 className="w-3 h-3" />
          {language === 'pt' ? 'Enquete' : 'Poll'}
        </span>
      );
      badges.push(
        <span key="closed" className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <CheckCircle className="w-3 h-3" />
          {language === 'pt' ? 'Encerrada' : 'Closed'}
        </span>
      );
    }

    return badges;
  };

  const getBorderTopColor = (item: FeedItem) => {
    if (item.type === 'task') {
      return item.taskType === 'offer' ? 'border-t-success' 
        : item.taskType === 'request' ? 'border-t-pink-600' 
        : 'border-t-info';
    }
    if (item.type === 'product') {
      return item.productType === 'offer' ? 'border-t-amber-500' : 'border-t-violet-500';
    }
    return 'border-t-info';
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

      {/* Feed grid - matching Para Você card style */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {finalItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ delay: index * 0.03 }}
            className={`relative glass rounded-xl p-5 cursor-pointer transition-all hover:shadow-soft overflow-hidden border-t-[3px] ${getBorderTopColor(item)} border-b border-x border-primary/20`}
            onClick={() => handleItemClick(item)}
          >
            {/* Type badges */}
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {getTypeBadges(item)}
            </div>

            {/* User info row */}
            <div className="flex items-center gap-3 mb-3" onClick={e => e.stopPropagation()}>
              <div className="cursor-pointer" onClick={() => navigate(`/profile/${item.userId}`)}>
                <UserAvatar
                  userId={item.userId}
                  name={item.userName}
                  avatarUrl={item.userAvatar}
                  size="lg"
                  className="flex-shrink-0"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p 
                    className="font-medium text-sm truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/profile/${item.userId}`)}
                  >
                    {item.userName}
                  </p>
                  {item.userVerified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.completedAt), {
                    addSuffix: true,
                    locale: dateLocale
                  })}
                </p>
              </div>
            </div>

            {/* Title */}
            <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>

            {/* Description */}
            {item.description && (
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{item.description}</p>
            )}

            {/* Hero image from proof */}
            {isImageProof(item) && item.proofUrl && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img
                  src={item.proofUrl}
                  alt={item.title}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}

            {/* Poll results mini chart */}
            {item.type === 'poll' && item.pollOptions && item.totalVotes && item.totalVotes > 0 && (
              <div className="space-y-1 mb-3">
                {item.pollOptions.map((opt, i) => {
                  const pct = Math.round((opt.votes / item.totalVotes!) * 100);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
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
                <p className="text-xs text-muted-foreground">
                  {item.totalVotes} {language === 'pt' ? 'votos' : 'votes'}
                </p>
              </div>
            )}

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                <MapPin className="w-3 h-3" />
                {item.location}
              </div>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4" onClick={e => e.stopPropagation()}>
                {item.tags.slice(0, 3).map(tag => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    displayName={getTranslatedName(tag as any)}
                    category={tag.category as any}
                    size="sm"
                    onClick={() => navigate(`/tags/${tag.id}`)}
                  />
                ))}
                {item.tags.length > 3 && <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>}
              </div>
            )}

            {/* Rating display for tasks/products */}
            {(item.averageRating && item.averageRating > 0) ? (
              <div className="flex items-center gap-2 mb-3">
                <StarRating rating={item.averageRating} size="sm" showValue />
                <span className="text-xs text-muted-foreground">
                  ({item.ratingCount} {language === 'pt' ? (item.ratingCount === 1 ? 'avaliação' : 'avaliações') : (item.ratingCount === 1 ? 'rating' : 'ratings')})
                </span>
              </div>
            ) : null}

            {/* Actions: like/dislike, clap, feedback */}
            <div className="pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
              <FeedCardActions
                itemId={item.id.replace(/^(task|product|poll)-/, '')}
                itemType={item.type}
                onFeedbackClick={() => setFeedbackTarget({ id: item.id.replace(/^(task|product|poll)-/, ''), title: item.title })}
              />
            </div>
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
