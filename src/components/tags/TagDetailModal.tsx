import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHiddenCommunityAccess } from '@/hooks/useHiddenCommunityAccess';
import { Tag as TagIcon, User, ListTodo, Calendar, Trash2, Loader2, UserPlus, UserMinus, BarChart3, Package, Link as LinkIcon, ArrowUp, ArrowDown, Sparkles, Plus, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CreateProductModal } from '@/components/products/CreateProductModal';
import { CreatePollModal } from '@/components/polls/CreatePollModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Task, Tag, Profile, Product, Poll } from '@/types';

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

type ActionTab = 'tasks' | 'products' | 'polls';
type TaskFilter = 'all' | 'open' | 'completed';
type ProductFilter = 'all' | 'offer' | 'request';
type PollFilter = 'all' | 'active' | 'closed';
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
  
  // Action tabs
  const [actionTab, setActionTab] = useState<ActionTab>('tasks');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [pollFilter, setPollFilter] = useState<PollFilter>('all');
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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
          .select('*')
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

  // --- Sorting ---
  function sortItems<T>(items: T[], getDate: (item: T) => string, getRelevance: (item: T) => number): T[] {
    const sorted = [...items];
    switch (sortMode) {
      case 'newest': return sorted.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());
      case 'oldest': return sorted.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime());
      case 'most_relevant': return sorted.sort((a, b) => getRelevance(b) - getRelevance(a));
      case 'least_relevant': return sorted.sort((a, b) => getRelevance(a) - getRelevance(b));
      default: return sorted;
    }
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

  // Filtered & sorted data
  const filteredTasks = useMemo(() => {
    const filtered = taskFilter === 'all'
      ? relatedTasks
      : relatedTasks.filter(t => taskFilter === 'completed' ? t.status === 'completed' : t.status !== 'completed');
    return sortItems(filtered, t => t.created_at, getTaskRelevance);
  }, [relatedTasks, taskFilter, sortMode]);

  const filteredProducts = useMemo(() => {
    const filtered = productFilter === 'all'
      ? relatedProducts
      : relatedProducts.filter(p => p.product_type === productFilter);
    return sortItems(filtered, p => p.created_at, getProductRelevance);
  }, [relatedProducts, productFilter, sortMode]);

  const filteredPolls = useMemo(() => {
    const filtered = pollFilter === 'all'
      ? relatedPolls
      : relatedPolls.filter(p => pollFilter === 'active' ? p.status === 'active' : p.status !== 'active');
    return sortItems(filtered, p => p.created_at, getPollRelevance);
  }, [relatedPolls, pollFilter, sortMode]);

  const actionTabs: { key: ActionTab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', count: relatedTasks.length, icon: <ListTodo className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', count: relatedProducts.length, icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Enquetes' : 'Polls', count: relatedPolls.length, icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const SortToggleButtons = () => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => toggleSort('date')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
          sortField === 'date'
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <Calendar className="w-3 h-3" />
        {language === 'pt' ? 'Data' : 'Date'}
        {sortField === 'date' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
      <button
        onClick={() => toggleSort('relevance')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
          sortField === 'relevance'
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        {language === 'pt' ? 'Relevância' : 'Relevance'}
        {sortField === 'relevance' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
    </div>
  );

  const FilterChips = ({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: any) => void }) => (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            value === opt.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-20 sm:pb-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-primary" />
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

                  {/* Sort Controls */}
                  <SortToggleButtons />

                  {/* Tab Bar */}
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                    {actionTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActionTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          actionTab === tab.key
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.count > 0 && (
                          <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                            actionTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tasks Tab */}
                  {actionTab === 'tasks' && (
                    <div className="space-y-2">
                      {relatedTasks.length > 0 && (
                        <FilterChips
                          value={taskFilter}
                          onChange={setTaskFilter}
                          options={[
                            { key: 'all', label: language === 'pt' ? 'Todas' : 'All' },
                            { key: 'open', label: language === 'pt' ? 'Em aberto' : 'Open' },
                            { key: 'completed', label: language === 'pt' ? 'Concluídas' : 'Completed' },
                          ]}
                        />
                      )}
                      {filteredTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('noRelatedTasks')}</p>
                      ) : (
                        <div className="space-y-2">
                          {filteredTasks.map(task => (
                            <button 
                              key={task.id} 
                              onClick={() => handleTaskClick(task.id)}
                              className="w-full p-3 rounded-lg bg-muted/50 flex items-center justify-between hover:bg-muted/70 transition-colors cursor-pointer text-left"
                            >
                              <span className="text-sm truncate flex-1 hover:underline">{task.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.status === 'completed' 
                                  ? 'bg-success/10 text-success' 
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {task.status === 'completed' ? t('taskCompleted') : t('taskOpen')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {user && (
                        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setCreateTaskOpen(true)}>
                          <Plus className="w-3.5 h-3.5" /><ListTodo className="w-3.5 h-3.5" />
                          {language === 'pt' ? 'Criar Tarefa' : 'Create Task'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Products Tab */}
                  {actionTab === 'products' && (
                    <div className="space-y-2">
                      {relatedProducts.length > 0 && (
                        <FilterChips
                          value={productFilter}
                          onChange={setProductFilter}
                          options={[
                            { key: 'all', label: language === 'pt' ? 'Todos' : 'All' },
                            { key: 'offer', label: language === 'pt' ? 'Ofertas' : 'Offers' },
                            { key: 'request', label: language === 'pt' ? 'Solicitações' : 'Requests' },
                          ]}
                        />
                      )}
                      {filteredProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {language === 'pt' ? 'Nenhum produto relacionado.' : 'No related products.'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredProducts.map(product => (
                            <div
                              key={product.id}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                                product.status === 'delivered' || product.status === 'unavailable'
                                  ? 'bg-muted/30 opacity-60'
                                  : 'bg-muted/50 hover:bg-muted/70'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  product.product_type === 'offer'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-orange-500/10 text-orange-600'
                                }`}>
                                  <Package className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{product.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')} · {language === 'pt' ? 'Qtd' : 'Qty'}: {product.quantity}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                product.status === 'available' ? 'bg-emerald-500/10 text-emerald-600' :
                                product.status === 'delivered' ? 'bg-blue-500/10 text-blue-600' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {product.status === 'available' ? (language === 'pt' ? 'Disponível' : 'Available') :
                                 product.status === 'delivered' ? (language === 'pt' ? 'Entregue' : 'Delivered') :
                                 (language === 'pt' ? 'Indisponível' : 'Unavailable')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {user && (
                        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setCreateProductOpen(true)}>
                          <Plus className="w-3.5 h-3.5" /><Package className="w-3.5 h-3.5" />
                          {language === 'pt' ? 'Criar Produto' : 'Create Product'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Polls Tab */}
                  {actionTab === 'polls' && (
                    <div className="space-y-2">
                      {relatedPolls.length > 0 && (
                        <FilterChips
                          value={pollFilter}
                          onChange={setPollFilter}
                          options={[
                            { key: 'all', label: language === 'pt' ? 'Todas' : 'All' },
                            { key: 'active', label: language === 'pt' ? 'Em votação' : 'Active' },
                            { key: 'closed', label: language === 'pt' ? 'Encerradas' : 'Closed' },
                          ]}
                        />
                      )}
                      {filteredPolls.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('noRelatedPolls')}</p>
                      ) : (
                        <div className="space-y-2">
                          {filteredPolls.map(poll => {
                            const isClosed = poll.status !== 'active' || isPollExpired(poll);
                            return (
                              <div 
                                key={poll.id} 
                                className={`rounded-lg px-3 py-2.5 space-y-2 ${isClosed ? 'bg-muted/30 opacity-70' : 'bg-muted/50'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{poll.title}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                                  }`}>
                                    {isClosed ? t('pollStatusClosed') : t('pollStatusActive')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{poll.options?.length || 0} {language === 'pt' ? 'opções' : 'options'}</span>
                                  <span>·</span>
                                  <span>{totalVotes(poll)} {language === 'pt' ? 'votos' : 'votes'}</span>
                                </div>
                                {poll.options && poll.options.length > 0 && (
                                  <div className="space-y-1">
                                    {poll.options.slice(0, 3).map(option => {
                                      const optionVotes = poll.votes?.filter(v => v.option_id === option.id).length || 0;
                                      const total = totalVotes(poll);
                                      const pct = total > 0 ? (optionVotes / total) * 100 : 0;
                                      return (
                                        <div key={option.id} className="flex items-center gap-2">
                                          <span className="text-xs truncate w-20 flex-shrink-0">{option.label}</span>
                                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {user && (
                        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setCreatePollOpen(true)}>
                          <Plus className="w-3.5 h-3.5" /><BarChart3 className="w-3.5 h-3.5" />
                          {language === 'pt' ? 'Criar Enquete' : 'Create Poll'}
                        </Button>
                      )}
                    </div>
                  )}
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
    </>
  );
}
