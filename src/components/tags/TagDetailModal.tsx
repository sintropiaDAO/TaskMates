import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHiddenCommunityAccess } from '@/hooks/useHiddenCommunityAccess';
import { Tag as TagIcon, User, ListTodo, Calendar, Trash2, Loader2, UserPlus, UserMinus, BarChart3, Package, Link as LinkIcon, ArrowUp, ArrowDown, Sparkles, Plus, AlertTriangle, Lightbulb, Hammer, Users, Search, CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import { ContentFilterDropdown, type ContentFilterValue, type TypeMode } from '@/components/dashboard/ContentFilterDropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CreateProductModal } from '@/components/products/CreateProductModal';
import { CreatePollModal } from '@/components/polls/CreatePollModal';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { PollDetailModal } from '@/components/polls/PollDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { usePolls } from '@/hooks/usePolls';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Task, Tag, Profile, Product, Poll } from '@/types';
import { PRODUCT_SAFE_COLUMNS } from '@/lib/productFields';
import { useHighlights } from '@/hooks/useHighlights';
import { cn } from '@/lib/utils';

interface TagDetailModalProps {
  tagId: string | null;
  tagName: string;
  tagCategory: 'skills' | 'communities';
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

interface RelatedProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TagCreator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

type OpenStatus = 'open' | 'completed';
type SortField = 'date' | 'relevance';
type SortDirection = 'desc' | 'asc';
type SortMode = 'newest' | 'oldest' | 'most_relevant' | 'least_relevant';

export function TagDetailModal({
  tagId,
  tagName,
  tagCategory,
  open,
  onClose,
  onDeleted,
}: TagDetailModalProps) {
  const { t, language } = useLanguage();
  const { getTranslatedName, tags, addUserTag, removeUserTag, userTags } = useTags();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isTagHidden, userFollowsHiddenTag, userIsInvitedToTag, userHasAccessToHiddenTag } = useHiddenCommunityAccess();
  const { vote: votePoll, addOption: addPollOption, deleteOption: deletePollOption, deletePoll, removeVote: removePollVote, fetchPollHistory, reopenPoll } = usePolls();
  const { deleteProduct, addParticipant } = useProducts();
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedPolls, setRelatedPolls] = useState<Poll[]>([]);
  const [relatedProfiles, setRelatedProfiles] = useState<RelatedProfile[]>([]);
  const [relatedCommunityTags, setRelatedCommunityTags] = useState<Tag[]>([]);
  const [creator, setCreator] = useState<TagCreator | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFollowingTag, setIsFollowingTag] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [productTaskId, setProductTaskId] = useState<string | undefined>(undefined);
  const [pollTaskId, setPollTaskId] = useState<string | undefined>(undefined);
  const [subtaskParentId, setSubtaskParentId] = useState<string | undefined>(undefined);
  
  // Content filter — using shared dashboard dropdown
  const [contentFilter, setContentFilter] = useState<ContentFilterValue>('all');
  const [typeMode, setTypeMode] = useState<TypeMode>('all');
  const [openStatus, setOpenStatus] = useState<OpenStatus>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  const cycleTypeMode = () => {
    setTypeMode(prev => prev === 'all' ? 'offer' : prev === 'offer' ? 'request' : 'all');
  };

  const categoryIcon = tagCategory === 'communities'
    ? <Users className="w-5 h-5 text-info" />
    : (tagCategory as string) === 'physical_resources'
    ? <Hammer className="w-5 h-5 text-amber-500" />
    : <Lightbulb className="w-5 h-5 text-primary" />;
  const sortMode: SortMode = sortField === 'date' 
    ? (sortDirection === 'desc' ? 'newest' : 'oldest') 
    : (sortDirection === 'desc' ? 'most_relevant' : 'least_relevant');
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  useEffect(() => {
    if (open && tagId) {
      fetchTagDetails();
      checkIfFollowing();
    }
  }, [open, tagId, userTags]);

  const checkIfFollowing = () => {
    if (!tagId) return;
    const isFollowing = userTags.some(ut => ut.tag_id === tagId);
    setIsFollowingTag(isFollowing);
  };

  const handleFollowTag = async () => {
    if (!tagId || !user) return;
    
    // Prevent direct following of hidden tags - must be invited
    if (!isFollowingTag && isTagHidden(tagId) && !userIsInvitedToTag(tagId)) {
      toast({ 
        title: language === 'pt' ? 'Comunidade privada' : 'Private community',
        description: language === 'pt' ? 'Você precisa ser convidado para seguir esta comunidade.' : 'You need an invitation to follow this community.',
        variant: 'destructive' 
      });
      return;
    }

    // If invited, accept the invite when following
    if (!isFollowingTag && isTagHidden(tagId) && userIsInvitedToTag(tagId)) {
      await supabase
        .from('community_invites')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('tag_id', tagId)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');
    }

    setFollowing(true);
    try {
      if (isFollowingTag) {
        await removeUserTag(tagId);
        toast({ title: t('profileTagRemoved') });
      } else {
        await addUserTag(tagId);
        toast({ title: t('profileTagAdded') });
      }
    } catch (error) {
      console.error('Error following/unfollowing tag:', error);
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setFollowing(false);
    }
  };

  const enrichTasks = async (tasksData: any[]): Promise<Task[]> => {
    if (tasksData.length === 0) return [];
    const taskIds = tasksData.map(t => t.id);
    const creatorIds = [...new Set(tasksData.map(t => t.created_by))];
    const [tagsResult, profilesResult] = await Promise.all([
      supabase.from('task_tags').select('task_id, tag:tags(*)').in('task_id', taskIds),
      supabase.from('public_profiles').select('*').in('id', creatorIds),
    ]);
    const tagsByTask: Record<string, Tag[]> = {};
    tagsResult.data?.forEach(tt => {
      if (!tagsByTask[tt.task_id]) tagsByTask[tt.task_id] = [];
      if (tt.tag) tagsByTask[tt.task_id].push(tt.tag as Tag);
    });
    const profilesMap: Record<string, Profile> = {};
    profilesResult.data?.forEach(p => { if (p.id) profilesMap[p.id] = p as unknown as Profile; });
    return tasksData.map(t => ({ ...t, tags: tagsByTask[t.id] || [], creator: profilesMap[t.created_by] })) as Task[];
  };

  const fetchTagDetails = async () => {
    if (!tagId) return;
    
    setLoading(true);
    try {
      // Fetch tag info including creator
      const { data: tagData } = await supabase
        .from('tags')
        .select('created_by, created_at')
        .eq('id', tagId)
        .maybeSingle();

      if (tagData) {
        setCreatedAt(tagData.created_at);
        
        if (tagData.created_by) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', tagData.created_by)
            .maybeSingle();
          
          setCreator(creatorProfile);
        }
      }

      // Fetch related tasks, profiles, polls, products, and community related tags in parallel
      const [taskTagsRes, userTagsRes, pollTagsRes, productTagsRes, communityRelTagsRes] = await Promise.all([
        supabase.from('task_tags').select('task_id').eq('tag_id', tagId),
        supabase.from('user_tags').select('user_id').eq('tag_id', tagId),
        supabase.from('poll_tags').select('poll_id').eq('tag_id', tagId),
        supabase.from('product_tags').select('product_id').eq('tag_id', tagId),
        tagCategory === 'communities'
          ? supabase.from('community_related_tags').select('related_tag_id').eq('community_tag_id', tagId)
          : Promise.resolve({ data: null }),
      ]);

      // Set community related tags
      if (communityRelTagsRes.data && communityRelTagsRes.data.length > 0) {
        const relTagIds = communityRelTagsRes.data.map((r: any) => r.related_tag_id);
        const { data: relTags } = await supabase.from('tags').select('*').in('id', relTagIds);
        setRelatedCommunityTags((relTags || []) as Tag[]);
      } else {
        setRelatedCommunityTags([]);
      }

      // Fetch and enrich tasks
      if (taskTagsRes.data && taskTagsRes.data.length > 0) {
        const taskIds = taskTagsRes.data.map(tt => tt.task_id);
        const { data: tasksRaw } = await supabase
          .from('tasks')
          .select('*')
          .in('id', taskIds)
          .order('created_at', { ascending: false })
          .limit(50);
        if (tasksRaw && tasksRaw.length > 0) {
          const enriched = await enrichTasks(tasksRaw);
          setRelatedTasks(enriched);
        } else {
          setRelatedTasks([]);
        }
      } else {
        setRelatedTasks([]);
      }

      // Fetch profiles
      if (userTagsRes.data && userTagsRes.data.length > 0) {
        const userIds = userTagsRes.data.map(ut => ut.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds)
          .limit(10);
        setRelatedProfiles(profiles || []);
      } else {
        setRelatedProfiles([]);
      }

      // Fetch polls
      if (pollTagsRes.data && pollTagsRes.data.length > 0) {
        const pollIds = pollTagsRes.data.map(pt => pt.poll_id);
        const { data: polls } = await supabase
          .from('polls')
          .select('*')
          .in('id', pollIds)
          .order('created_at', { ascending: false })
          .limit(50);
        if (polls && polls.length > 0) {
          const creatorIds = [...new Set(polls.map(p => p.created_by))];
          const pollIdsList = polls.map(p => p.id);
          const [profilesRes, optionsRes, votesRes] = await Promise.all([
            supabase.from('public_profiles').select('*').in('id', creatorIds),
            supabase.from('poll_options').select('*').in('poll_id', pollIdsList),
            supabase.from('poll_votes').select('*').in('poll_id', pollIdsList),
          ]);
          const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
          setRelatedPolls(polls.map(p => ({
            ...p,
            creator: profileMap.get(p.created_by) as Profile,
            status: p.status as 'active' | 'closed',
            options: optionsRes.data?.filter(o => o.poll_id === p.id) || [],
            votes: votesRes.data?.filter(v => v.poll_id === p.id) || [],
          })));
        } else {
          setRelatedPolls([]);
        }
      } else {
        setRelatedPolls([]);
      }

      // Fetch products
      if (productTagsRes.data && productTagsRes.data.length > 0) {
        const productIds = productTagsRes.data.map(pt => pt.product_id);
        const { data: products } = await supabase
          .from('products')
          .select(PRODUCT_SAFE_COLUMNS)
          .in('id', productIds)
          .order('created_at', { ascending: false })
          .limit(50);
        if (products && products.length > 0) {
          const creatorIds = [...new Set(products.map(p => p.created_by))];
          const { data: profiles } = await supabase.from('public_profiles').select('*').in('id', creatorIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          setRelatedProducts(products.map(p => ({
            ...p,
            creator: profileMap.get(p.created_by) as Profile,
            product_type: p.product_type as 'offer' | 'request',
            status: p.status as 'available' | 'unavailable' | 'delivered',
          })));
        } else {
          setRelatedProducts([]);
        }
      } else {
        setRelatedProducts([]);
      }
    } catch (error) {
      console.error('Error fetching tag details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tagId || !isAdmin) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        toast({ 
          title: t('error'), 
          description: error.message, 
          variant: 'destructive' 
        });
      } else {
        toast({ title: t('tagDeleted') });
        onDeleted?.();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleTaskClick = async (taskId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (data) {
      // Enrich with tags and creator
      const [tagsResult, profileResult] = await Promise.all([
        supabase.from('task_tags').select('tag:tags(*)').eq('task_id', taskId),
        supabase.from('public_profiles').select('*').eq('id', data.created_by).single(),
      ]);
      
      const taskTags = tagsResult.data?.map(tt => tt.tag).filter(Boolean) || [];
      
      setSelectedTask({
        ...data,
        tags: taskTags as Tag[],
        creator: profileResult.data as unknown as Profile,
      } as Task);
    }
  };

  const handleProfileClick = (profileId: string) => {
    onClose();
    navigate(`/profile/${profileId}`);
  };

  const dateLocale = language === 'pt' ? ptBR : enUS;

  // --- Highlights (Lucky Star featured items go to top) ---
  const { isTaskHighlighted, isProductHighlighted } = useHighlights();

  // --- Sorting ---
  function sortItems<T>(
    items: T[],
    getDate: (item: T) => string,
    getRelevance: (item: T) => number,
    isHighlighted?: (item: T) => boolean,
  ): T[] {
    const sorted = [...items];
    let result: T[];
    switch (sortMode) {
      case 'newest': result = sorted.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()); break;
      case 'oldest': result = sorted.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime()); break;
      case 'most_relevant': result = sorted.sort((a, b) => getRelevance(b) - getRelevance(a)); break;
      case 'least_relevant': result = sorted.sort((a, b) => getRelevance(a) - getRelevance(b)); break;
      default: result = sorted;
    }
    if (isHighlighted) {
      const highlighted = result.filter(isHighlighted);
      const rest = result.filter(i => !isHighlighted(i));
      return [...highlighted, ...rest];
    }
    return result;
  }

  const getTaskRelevance = (t: Task): number => {
    const upvotes = t.upvotes || 0;
    const total = upvotes + (t.downvotes || 0) + (t.likes || 0) + (t.dislikes || 0);
    return total;
  };

  const getProductRelevance = (p: Product): number => {
    return (p.upvotes || 0) + (p.downvotes || 0);
  };

  const getPollRelevance = (p: Poll): number => {
    const votes = p.votes?.length || 0;
    return (p.upvotes || 0) + (p.downvotes || 0) + votes;
  };

  const isPollOpen = (p: Poll) => p.status === 'active' && !(p.deadline && new Date(p.deadline) < new Date());
  const isProductOpen = (p: Product) => p.status !== 'delivered';
  const isTaskOpen = (t: Task) => t.status !== 'completed';

  const matchesSearch = (title: string) =>
    !searchQuery.trim() || title.toLowerCase().includes(searchQuery.trim().toLowerCase());

  type UnifiedItem =
    | { kind: 'task'; item: Task; date: string; relevance: number; highlighted: boolean }
    | { kind: 'product'; item: Product; date: string; relevance: number; highlighted: boolean }
    | { kind: 'poll'; item: Poll; date: string; relevance: number; highlighted: boolean };

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Tasks
    if (contentFilter === 'all' || contentFilter === 'tasks') {
      relatedTasks.forEach(t => {
        if (typeMode !== 'all' && t.task_type !== typeMode) return;
        if (openStatus === 'open' ? !isTaskOpen(t) : isTaskOpen(t)) return;
        if (!matchesSearch(t.title)) return;
        items.push({ kind: 'task', item: t, date: t.created_at, relevance: getTaskRelevance(t), highlighted: isTaskHighlighted(t.id) });
      });
    }

    // Products
    if (contentFilter === 'all' || contentFilter === 'products') {
      relatedProducts.forEach(p => {
        if (typeMode !== 'all' && p.product_type !== typeMode) return;
        if (openStatus === 'open' ? !isProductOpen(p) : isProductOpen(p)) return;
        if (!matchesSearch(p.title)) return;
        items.push({ kind: 'product', item: p, date: p.created_at, relevance: getProductRelevance(p), highlighted: isProductHighlighted(p.id) });
      });
    }

    // Polls (typeMode only applies to tasks/products)
    if (contentFilter === 'all' || contentFilter === 'polls') {
      if (typeMode === 'all' || contentFilter === 'polls') {
        relatedPolls.forEach(p => {
          if (openStatus === 'open' ? !isPollOpen(p) : isPollOpen(p)) return;
          if (!matchesSearch(p.title)) return;
          items.push({ kind: 'poll', item: p, date: p.created_at, relevance: getPollRelevance(p), highlighted: false });
        });
      }
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortDirection === 'desc' ? diff : -diff;
      }
      const diff = b.relevance - a.relevance;
      return sortDirection === 'desc' ? diff : -diff;
    });

    // Highlighted first
    const highlighted = sorted.filter(i => i.highlighted);
    const rest = sorted.filter(i => !i.highlighted);
    return [...highlighted, ...rest];
  }, [relatedTasks, relatedProducts, relatedPolls, contentFilter, typeMode, openStatus, searchQuery, sortField, sortDirection, isTaskHighlighted, isProductHighlighted]);

  const isPollExpired = (poll: Poll) => {
    if (!poll.deadline) return false;
    return new Date(poll.deadline) < new Date();
  };

  const totalVotes = (poll: Poll) => poll.votes?.length || 0;

  // Block access to hidden tags for non-followers and non-invited users
  const isHidden = tagId ? isTagHidden(tagId) : false;
  const userHasAccess = tagId ? !isHidden || userHasAccessToHiddenTag(tagId) : true;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg sm:max-w-3xl lg:max-w-4xl max-h-[90vh] sm:max-h-[88vh] overflow-y-auto pb-20 sm:pb-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {categoryIcon}
              {t('tagDetails')}
            </DialogTitle>
          </DialogHeader>

          {!userHasAccess ? (
            <div className="text-center py-8 space-y-3">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {language === 'pt'
                  ? 'Esta comunidade é privada. Você precisa ser convidado para ter acesso.'
                  : 'This community is private. You need an invitation to access it.'}
              </p>
            </div>
          ) : (

          <div className="space-y-6">
            {/* Tag Info */}
            <div className="flex items-center justify-between gap-2">
              <TagBadge name={tagName} category={tagCategory} size="md" displayName={tags.find(t => t.id === tagId) ? getTranslatedName(tags.find(t => t.id === tagId)!) : tagName} />
              <div className="flex items-center gap-2">
                {user && (
                  <Button 
                    variant={isFollowingTag ? "outline" : "default"} 
                    size="sm"
                    onClick={handleFollowTag}
                    disabled={following}
                  >
                    {following ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowingTag ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        {t('profileUnfollow')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        {t('profileFollow')}
                      </>
                    )}
                  </Button>
                )}
                {isAdmin && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t('delete')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('loading')}
              </div>
            ) : (
              <>
                {/* Creator Info */}
                {(creator || createdAt) && (
                  <div className="glass rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {t('createdBy')}
                    </h4>
                    <div className="flex items-center gap-3">
                      {creator && (
                        <button
                          onClick={() => handleProfileClick(creator.id)}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={creator.avatar_url || undefined} alt={creator.full_name || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {creator.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm hover:underline">{creator.full_name || t('anonymous')}</span>
                        </button>
                      )}
                      {createdAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(createdAt), 'dd/MM/yyyy', { locale: dateLocale })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Related Tags (for communities) */}
                {tagCategory === 'communities' && relatedCommunityTags.length > 0 && (
                  <div className="glass rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <TagIcon className="w-4 h-4" />
                      {language === 'pt' ? 'Tags Relacionadas' : 'Related Tags'}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedCommunityTags.map(rtag => (
                        <TagBadge
                          key={rtag.id}
                          name={rtag.name}
                          category={rtag.category}
                          displayName={getTranslatedName(rtag)}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Actions (Tasks, Products, Polls) */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    {language === 'pt' ? 'Ações Relacionadas' : 'Related Actions'}
                  </h4>

                  {/* 1. Generic Create + button */}
                  {user && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="w-full gap-2">
                          <Plus className="w-4 h-4" />
                          {language === 'pt' ? 'Criar' : 'Create'}
                          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="clay bg-card border-0 rounded-2xl p-1.5 min-w-[12rem] z-[1100]">
                        <DropdownMenuItem onSelect={() => setCreateTaskOpen(true)} className="rounded-xl gap-2 cursor-pointer px-3 py-2 text-sm">
                          <ListTodo className="w-4 h-4 text-primary" />
                          {language === 'pt' ? 'Tarefa' : 'Task'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCreateProductOpen(true)} className="rounded-xl gap-2 cursor-pointer px-3 py-2 text-sm">
                          <Package className="w-4 h-4 text-primary" />
                          {language === 'pt' ? 'Produto' : 'Product'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCreatePollOpen(true)} className="rounded-xl gap-2 cursor-pointer px-3 py-2 text-sm">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          {language === 'pt' ? 'Enquete' : 'Poll'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* 2. Divider + panel with search, filters and list */}
                  <div className="relative pt-3">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    <div className="glass rounded-2xl p-3 space-y-3 animate-fade-in">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder={language === 'pt' ? 'Buscar...' : 'Search...'}
                          className="pl-9 h-9 text-sm rounded-xl"
                        />
                      </div>

                      {/* 3. Sort + Open/Completed toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSort('date')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors',
                            sortField === 'date' ? 'bg-accent text-accent-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted/80',
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          {language === 'pt' ? 'Data' : 'Date'}
                          {sortField === 'date' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                        </button>
                        <button
                          onClick={() => toggleSort('relevance')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors',
                            sortField === 'relevance' ? 'bg-accent text-accent-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted/80',
                          )}
                        >
                          <Sparkles className="w-3 h-3" />
                          {language === 'pt' ? 'Relevância' : 'Relevance'}
                          {sortField === 'relevance' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                        </button>
                        <button
                          onClick={() => setOpenStatus(prev => prev === 'open' ? 'completed' : 'open')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors',
                            openStatus === 'open'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted/80',
                          )}
                          title={language === 'pt' ? 'Alternar entre em aberto e concluídas' : 'Toggle between open and completed'}
                        >
                          {openStatus === 'open' ? <Circle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {openStatus === 'open'
                            ? (language === 'pt' ? 'Aberta' : 'Open')
                            : (language === 'pt' ? 'Concluída' : 'Completed')}
                        </button>
                      </div>

                      {/* 4. Content type dropdown */}
                      <ContentFilterDropdown
                        value={contentFilter}
                        onChange={setContentFilter}
                        typeMode={typeMode}
                        onCycleType={cycleTypeMode}
                        className="mb-0 justify-start"
                      />

                      {/* 5. Unified list */}
                      {unifiedItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'pt' ? 'Nada por aqui ainda.' : 'Nothing here yet.'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {unifiedItems.map((entry, idx) => {
                            const key = `${entry.kind}-${entry.item.id}`;
                            const delay = { animationDelay: `${Math.min(idx * 40, 300)}ms` };
                            if (entry.kind === 'task') {
                              const task = entry.item;
                              return (
                                <div key={key} className="animate-fade-in" style={delay}>
                                  <TaskCardMini
                                    task={task}
                                    onClick={() => handleTaskClick(task.id)}
                                    completionDate={task.status === 'completed' ? task.updated_at : undefined}
                                  />
                                </div>
                              );
                            }
                            if (entry.kind === 'product') {
                              const product = entry.item;
                              const isDelivered = product.status === 'delivered';
                              return (
                                <button
                                  key={key}
                                  onClick={() => setSelectedProduct(product)}
                                  style={delay}
                                  className={cn(
                                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border-l-4 animate-fade-in',
                                    product.product_type === 'offer' ? 'border-l-success' : 'border-l-pink-500',
                                    isDelivered ? 'bg-muted/30 opacity-70 hover:opacity-90' : 'bg-card/50 hover:bg-card/80',
                                  )}
                                >
                                  <div className={cn(
                                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                                    product.product_type === 'offer' ? 'bg-success/10 text-success' : 'bg-pink-500/10 text-pink-600',
                                  )}>
                                    <Package className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground truncate mb-0.5">
                                      {product.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}
                                    </p>
                                    <h4 className="font-medium text-sm line-clamp-1">{product.title}</h4>
                                  </div>
                                  <span className={cn(
                                    'text-[11px] px-2 py-0.5 rounded-full flex-shrink-0',
                                    isDelivered ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                  )}>
                                    {isDelivered
                                      ? (language === 'pt' ? 'Entregue' : 'Delivered')
                                      : `${language === 'pt' ? 'Qtd' : 'Qty'}: ${product.quantity}`}
                                  </span>
                                </button>
                              );
                            }
                            // poll
                            const poll = entry.item;
                            const isClosed = !isPollOpen(poll);
                            return (
                              <button
                                key={key}
                                onClick={() => setSelectedPoll(poll)}
                                style={delay}
                                className={cn(
                                  'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border-l-4 border-l-blue-500 animate-fade-in',
                                  isClosed ? 'bg-muted/30 opacity-70 hover:opacity-90' : 'bg-card/50 hover:bg-card/80',
                                )}
                              >
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                                  <BarChart3 className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground truncate mb-0.5">
                                    {poll.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}
                                  </p>
                                  <h4 className="font-medium text-sm line-clamp-1">{poll.title}</h4>
                                </div>
                                <span className={cn(
                                  'text-[11px] px-2 py-0.5 rounded-full flex-shrink-0',
                                  isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                                )}>
                                  {totalVotes(poll)} {language === 'pt' ? 'votos' : 'votes'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Related Profiles */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('relatedProfiles')} ({relatedProfiles.length})
                  </h4>
                  {relatedProfiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noRelatedProfiles')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {relatedProfiles.map(profile => (
                        <button 
                          key={profile.id} 
                          onClick={() => handleProfileClick(profile.id)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm hover:underline">{profile.full_name || t('anonymous')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          )}
        </DialogContent>
      </Dialog>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onCreateSubtask={(parentTask) => {
          setSelectedTask(null);
          setSubtaskParentId(parentTask.id);
          setCreateTaskOpen(true);
        }}
        onOpenRelatedTask={(task) => setSelectedTask(task)}
        onCreatePoll={(taskId) => { setPollTaskId(taskId); setCreatePollOpen(true); }}
        onCreateProduct={(taskId) => { setProductTaskId(taskId); setCreateProductOpen(true); }}
      />

      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => { setCreateTaskOpen(false); setSubtaskParentId(undefined); fetchTagDetails(); }}
        onSubmit={async (title, description, taskType, tagIds, deadline, imageUrl, priority, location) => {
          if (!user) return null;
          const insertData: any = {
            title, description, task_type: taskType, created_by: user.id,
            deadline: deadline || null, image_url: imageUrl || null,
            priority: priority || null, location: location || null,
          };
          if (subtaskParentId) insertData.parent_task_id = subtaskParentId;
          const { data, error } = await supabase.from('tasks').insert(insertData).select().single();
          if (error || !data) return null;
          if (tagIds.length > 0) {
            await supabase.from('task_tags').insert(tagIds.map(tid => ({ task_id: data.id, tag_id: tid })));
          }
          fetchTagDetails();
          return data as Task;
        }}
        preSelectedTags={tagId ? [tagId] : undefined}
      />

      <CreateProductModal
        open={createProductOpen}
        onClose={() => { setCreateProductOpen(false); setProductTaskId(undefined); fetchTagDetails(); }}
        onSubmit={async (title, description, productType, tagIds, quantity, imageUrl, priority, location) => {
          if (!user) return null;
          const { data, error } = await supabase.from('products').insert({
            title, description, product_type: productType, created_by: user.id,
            quantity, image_url: imageUrl || null, priority: priority || null, location: location || null,
          }).select().single();
          if (error || !data) return null;
          if (tagIds.length > 0) {
            await supabase.from('product_tags').insert(tagIds.map(tid => ({ product_id: data.id, tag_id: tid })));
          }
          if (productTaskId) {
            await supabase.from('task_products').insert({ task_id: productTaskId, product_id: data.id });
          }
          fetchTagDetails();
          return data;
        }}
        taskId={productTaskId}
        preSelectedTags={tagId ? [tagId] : undefined}
      />

      <CreatePollModal
        open={createPollOpen}
        onClose={() => { setCreatePollOpen(false); setPollTaskId(undefined); fetchTagDetails(); }}
        onSubmit={async (title, description, options, tagIds, deadline, allowNewOptions, taskIdParam, minQuorum, imageUrl) => {
          if (!user) return null;
          const { data, error } = await supabase.from('polls').insert({
            title, description, created_by: user.id, deadline: deadline || null,
            allow_new_options: allowNewOptions ?? false,
            task_id: pollTaskId || taskIdParam || null,
            min_quorum: minQuorum || null, image_url: imageUrl || null,
          }).select().single();
          if (error || !data) return null;
          if (options.length > 0) {
            await supabase.from('poll_options').insert(options.map(label => ({ poll_id: data.id, label, created_by: user.id })));
          }
          if (tagIds.length > 0) {
            await supabase.from('poll_tags').insert(tagIds.map(tid => ({ poll_id: data.id, tag_id: tid })));
          }
          fetchTagDetails();
          return data;
        }}
        taskId={pollTaskId}
        preSelectedTags={tagId ? [tagId] : undefined}
      />

      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onRefresh={fetchTagDetails}
        onDelete={deleteProduct}
        onParticipate={addParticipant}
      />

      <PollDetailModal
        poll={selectedPoll}
        open={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
        onVote={votePoll}
        onAddOption={addPollOption}
        onRefresh={fetchTagDetails}
      />
    </>
  );
}
