import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Tag as TagIcon, User, ListTodo, Calendar as CalendarIcon, Trash2, Loader2,
  UserPlus, UserMinus, ArrowLeft, Plus, Search, ChevronDown, ChevronUp, MapPin, List,
  Image as ImageIcon, Share2, LogIn, Settings, Package, BarChart3, Link as LinkIcon,
  ArrowUp, ArrowDown, Sparkles, GitBranch
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { Calendar } from '@/components/ui/calendar';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CreateProductModal } from '@/components/products/CreateProductModal';
import { CreatePollModal } from '@/components/polls/CreatePollModal';
import { MediaGallery } from '@/components/tags/MediaGallery';
import { ShareTagModal } from '@/components/tags/ShareTagModal';
import { CommunityAdminPanel } from '@/components/tags/CommunityAdminPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Task, Tag, Profile, Product, Poll } from '@/types';
import { cn } from '@/lib/utils';
import { FlagReportButton } from '@/components/reports/FlagReportButton';

type StatusFilter = 'all' | 'open' | 'completed';
type ViewMode = 'list' | 'calendar';
type ActionTab = 'tasks' | 'products' | 'polls';
type ProductFilter = 'all' | 'offer' | 'request';
type PollFilter = 'all' | 'active' | 'closed';
type SortField = 'date' | 'relevance';
type SortDirection = 'desc' | 'asc';
type SortMode = 'newest' | 'oldest' | 'most_relevant' | 'least_relevant';

const MAX_VISIBLE_TASKS = 8;

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

export default function TagDetail() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { getTranslatedName, tags, addUserTag, removeUserTag, userTags } = useTags();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [tagData, setTagData] = useState<Tag | null>(null);
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedPolls, setRelatedPolls] = useState<Poll[]>([]);
  const [relatedProfiles, setRelatedProfiles] = useState<RelatedProfile[]>([]);
  const [relatedCommunityTags, setRelatedCommunityTags] = useState<Tag[]>([]);
  const [creator, setCreator] = useState<TagCreator | null>(null);
  const [collectiveProducts, setCollectiveProducts] = useState<Product[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [pollFilter, setPollFilter] = useState<PollFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [actionTab, setActionTab] = useState<ActionTab>('tasks');

  // Sorting
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

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [productTaskId, setProductTaskId] = useState<string | undefined>(undefined);
  const [pollTaskId, setPollTaskId] = useState<string | undefined>(undefined);
  const [subtaskParentId, setSubtaskParentId] = useState<string | undefined>(undefined);
  const [shareOpen, setShareOpen] = useState(false);
  const [communitySettings, setCommunitySettings] = useState<{
    header_image_url: string | null;
    logo_url: string | null;
    logo_emoji: string | null;
    is_hidden: boolean;
    description?: string | null;
  } | null>(null);

  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isFollowingTag = userTags.some(ut => ut.tag_id === tagId);
  const tag = tags.find(t => t.id === tagId) || tagData;

  useEffect(() => {
    if (tagId) {
      fetchTagDetails();
    }
  }, [tagId]);

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
      // Fetch tag info
      const { data: tagInfo } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .maybeSingle();

      if (tagInfo) {
        setTagData(tagInfo as Tag);

        if (tagInfo.created_by) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', tagInfo.created_by)
            .maybeSingle();
          setCreator(creatorProfile);
        }

        // Fetch community settings for display
        if (tagInfo.category === 'communities') {
          const { data: cs } = await supabase
            .from('community_settings')
            .select('header_image_url, logo_url, logo_emoji, is_hidden, description')
            .eq('tag_id', tagId)
            .maybeSingle();
          if (cs) setCommunitySettings(cs);
        }
      }

      // Fetch related tasks, profiles, polls, products, and community tags in parallel
      const [taskTagsRes, userTagsRes, pollTagsRes, productTagsRes, communityRelTagsRes] = await Promise.all([
        supabase.from('task_tags').select('task_id').eq('tag_id', tagId),
        supabase.from('user_tags').select('user_id').eq('tag_id', tagId),
        supabase.from('poll_tags').select('poll_id').eq('tag_id', tagId),
        supabase.from('product_tags').select('product_id').eq('tag_id', tagId),
        tagInfo?.category === 'communities'
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

      // Fetch and enrich tasks with tags
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
          .in('id', userIds);
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

      // Fetch products (all, not just collective)
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
          const allProducts = products.map(p => ({
            ...p,
            creator: profileMap.get(p.created_by) as Profile,
            product_type: p.product_type as 'offer' | 'request',
            status: p.status as 'available' | 'unavailable' | 'delivered',
          }));
          setRelatedProducts(allProducts);
          setCollectiveProducts(allProducts.filter(p => p.collective_use));
        } else {
          setRelatedProducts([]);
          setCollectiveProducts([]);
        }
      } else {
        setRelatedProducts([]);
        setCollectiveProducts([]);
      }
    } catch (error) {
      console.error('Error fetching tag details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowTag = async () => {
    if (!tagId || !user) return;
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
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setFollowing(false);
    }
  };

  const handleDelete = async () => {
    if (!tagId || !isAdmin) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
      } else {
        toast({ title: t('tagDeleted') });
        navigate(-1);
      }
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // --- Sorting helpers ---
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
    return (t.upvotes || 0) + (t.downvotes || 0) + (t.likes || 0) + (t.dislikes || 0);
  };
  const getProductRelevance = (p: Product): number => {
    return (p.upvotes || 0) + (p.downvotes || 0);
  };
  const getPollRelevance = (p: Poll): number => {
    return (p.upvotes || 0) + (p.downvotes || 0) + (p.votes?.length || 0);
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let tasks = relatedTasks;
    if (statusFilter === 'open') tasks = tasks.filter(t => t.status !== 'completed');
    else if (statusFilter === 'completed') tasks = tasks.filter(t => t.status === 'completed');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.creator?.full_name?.toLowerCase().includes(q)
      );
    }
    return sortItems(tasks, t => t.created_at, getTaskRelevance);
  }, [relatedTasks, statusFilter, searchQuery, sortMode]);

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

  // Status counts
  const statusCounts = useMemo(() => ({
    all: relatedTasks.length,
    open: relatedTasks.filter(t => t.status !== 'completed').length,
    completed: relatedTasks.filter(t => t.status === 'completed').length,
  }), [relatedTasks]);

  // Calendar helpers
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      if (task.deadline) {
        const dateKey = format(new Date(task.deadline), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTasks.filter(t =>
      t.deadline && isSameDay(new Date(t.deadline), selectedDate)
    );
  }, [filteredTasks, selectedDate]);

  const daysWithTasks = useMemo(() => {
    return filteredTasks.filter(t => t.deadline).map(t => new Date(t.deadline!));
  }, [filteredTasks]);

  const handleTaskClick = (task: Task) => {
    // Task is already enriched with tags and creator
    setSelectedTask(task);
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  const isPollExpired = (poll: Poll) => {
    if (!poll.deadline) return false;
    return new Date(poll.deadline) < new Date();
  };
  const totalVotes = (poll: Poll) => poll.votes?.length || 0;

  const actionTabs: { key: ActionTab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', count: relatedTasks.length, icon: <ListTodo className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', count: relatedProducts.length, icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Enquetes' : 'Polls', count: relatedPolls.length, icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">{t('error')}</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      </div>
    );
  }

  const displayName = getTranslatedName(tag);
  const categoryLabel = tag.category === 'skills'
    ? (language === 'pt' ? 'Habilidade' : 'Skill')
    : tag.category === 'communities'
    ? (language === 'pt' ? 'Comunidade' : 'Community')
    : (language === 'pt' ? 'Recurso Físico' : 'Physical Resource');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6 overflow-x-hidden">
      {/* Community Header Image */}
      {communitySettings?.header_image_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative -mx-4 -mt-6 mb-2"
        >
          <img
            src={communitySettings.header_image_url}
            alt="Community header"
            className="w-full h-40 sm:h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground">{categoryLabel}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {communitySettings?.logo_url ? (
              <img src={communitySettings.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : communitySettings?.logo_emoji ? (
              <span className="text-2xl flex-shrink-0">{communitySettings.logo_emoji}</span>
            ) : (
              <TagIcon className="w-6 h-6 text-primary flex-shrink-0" />
            )}
            <h1 className="text-2xl font-bold">{displayName}</h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {tagId && <FlagReportButton entityType="tag" entityId={tagId} entityTitle={displayName} />}
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="w-4 h-4 mr-1" />
              {language === 'pt' ? 'Compartilhar' : 'Share'}
            </Button>
            {user && (
              <Button
                variant={isFollowingTag ? 'outline' : 'default'}
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
            {isAdmin && tag.category !== 'communities' && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Community Admin Panel */}
      {user && tag.category === 'communities' && (
        <CommunityAdminPanel
          tagId={tagId || ''}
          tagCategory={tag.category}
          onSettingsChange={(s) => setCommunitySettings(s)}
        />
      )}

      {/* Community Description */}
      {communitySettings?.description && (
        <p className="text-sm text-muted-foreground px-1 whitespace-pre-line">{communitySettings.description}</p>
      )}

      {(creator || tag.created_at) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          {creator && (
            <button
              onClick={() => handleProfileClick(creator.id)}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                  {creator.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hover:underline">{creator.full_name || t('anonymous')}</span>
            </button>
          )}
          {tag.created_at && (
            <span className="flex items-center gap-1">
              · {format(new Date(tag.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
            </span>
          )}
        </div>
      )}

      {/* Related Tags (for communities) */}
      {tag.category === 'communities' && relatedCommunityTags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-4 space-y-2"
        >
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-primary" />
            {language === 'pt' ? 'Tags Relacionadas' : 'Related Tags'}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {relatedCommunityTags.map(rtag => (
              <TagBadge
                key={rtag.id}
                name={rtag.name}
                category={rtag.category}
                displayName={getTranslatedName(rtag)}
                size="sm"
                onClick={() => navigate(`/tags/${rtag.id}`)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Related Actions (Tasks, Products, Polls) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border bg-card p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            {language === 'pt' ? 'Ações Relacionadas' : 'Related Actions'}
          </h3>
          {actionTab === 'tasks' && (
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleSort('date')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              sortField === 'date'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <CalendarIcon className="w-3 h-3" />
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
          <div className="space-y-3">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-1">
              {([
                { key: 'all' as StatusFilter, label: `${t('filterAllTasks')} (${statusCounts.all})` },
                { key: 'open' as StatusFilter, label: `${t('taskOpen')} (${statusCounts.open})` },
                { key: 'completed' as StatusFilter, label: `${t('taskCompleted')} (${statusCounts.completed})` },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                    statusFilter === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'pt' ? 'Buscar por título, localidade ou pessoa...' : 'Search by title, location or person...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Create Task Button */}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {t('dashboardCreateTask')}
            </Button>

            {viewMode === 'list' ? (
              <div className="space-y-2">
                {filteredTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('noRelatedTasks')}</p>
                ) : (
                  <>
                    {(showAllTasks ? filteredTasks : filteredTasks.slice(0, MAX_VISIBLE_TASKS)).map(task => (
                      <TaskCardMini
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        completionDate={task.status === 'completed' ? task.updated_at : undefined}
                      />
                    ))}
                    {filteredTasks.length > MAX_VISIBLE_TASKS && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs gap-1"
                        onClick={() => setShowAllTasks(!showAllTasks)}
                      >
                        {showAllTasks ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            {t('showLess')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            {t('showMore')} ({filteredTasks.length - MAX_VISIBLE_TASKS})
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={dateLocale}
                    className="p-3 pointer-events-auto rounded-lg border"
                    modifiers={{ hasTask: daysWithTasks }}
                    modifiersClassNames={{ hasTask: 'bg-primary/20 font-bold text-primary' }}
                  />
                </div>
                {selectedDate && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      {format(selectedDate, 'dd MMMM yyyy', { locale: dateLocale })} — {tasksForSelectedDate.length} {language === 'pt' ? 'tarefa(s)' : 'task(s)'}
                    </h4>
                    {tasksForSelectedDate.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('noRelatedTasks')}</p>
                    ) : (
                      tasksForSelectedDate.map(task => (
                        <TaskCardMini key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                      ))
                    )}
                  </div>
                )}
                {!selectedDate && (
                  <p className="text-sm text-muted-foreground text-center">
                    {language === 'pt' ? 'Selecione uma data para ver as tarefas' : 'Select a date to see tasks'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {actionTab === 'products' && (
          <div className="space-y-2">
            {relatedProducts.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: 'all' as ProductFilter, label: language === 'pt' ? 'Todos' : 'All' },
                  { key: 'offer' as ProductFilter, label: language === 'pt' ? 'Ofertas' : 'Offers' },
                  { key: 'request' as ProductFilter, label: language === 'pt' ? 'Solicitações' : 'Requests' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setProductFilter(opt.key)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                      productFilter === opt.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: 'all' as PollFilter, label: language === 'pt' ? 'Todas' : 'All' },
                  { key: 'active' as PollFilter, label: language === 'pt' ? 'Em votação' : 'Active' },
                  { key: 'closed' as PollFilter, label: language === 'pt' ? 'Encerradas' : 'Closed' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPollFilter(opt.key)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                      pollFilter === opt.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
      </motion.div>

      {/* Related Profiles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border bg-card p-4 space-y-3"
      >
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {t('relatedProfiles')} ({relatedProfiles.length})
        </h3>
        {relatedProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noRelatedProfiles')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {relatedProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleProfileClick(profile.id)}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hover:underline">{profile.full_name || t('anonymous')}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Collective Products */}
      {tag.category === 'communities' && collectiveProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border bg-card p-4 space-y-3"
        >
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {language === 'pt' ? 'Produtos Coletivos' : 'Collective Products'} ({collectiveProducts.length})
          </h3>
          <div className="space-y-2">
            {collectiveProducts.map(product => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                {product.image_url && (
                  <img src={product.image_url} alt={product.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`px-1.5 py-0.5 rounded-full ${product.product_type === 'offer' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')}
                    </span>
                    {product.creator?.full_name && <span>· {product.creator.full_name}</span>}
                    <span>· {language === 'pt' ? 'Qtd' : 'Qty'}: {product.quantity}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${product.status === 'available' ? 'bg-success/10 text-success' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                  {product.status === 'available' ? (language === 'pt' ? 'Disponível' : 'Available') : (language === 'pt' ? 'Indisponível' : 'Unavailable')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Media Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border bg-card p-4 space-y-3"
      >
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          {language === 'pt' ? 'Mídias' : 'Media'}
        </h3>
        <MediaGallery
          taskIds={relatedTasks.map(t => t.id)}
          tasks={relatedTasks}
          onTaskClick={handleTaskClick}
        />
      </motion.div>

      {/* Guest CTA */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-lg p-6 text-center space-y-3"
        >
          <LogIn className="w-8 h-8 text-primary mx-auto" />
          <h3 className="font-semibold text-lg">
            {language === 'pt' ? 'Participe da comunidade!' : 'Join the community!'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'pt'
              ? 'Crie uma conta para seguir esta tag, criar tarefas e colaborar com outras pessoas.'
              : 'Create an account to follow this tag, create tasks and collaborate with others.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(`/auth?tag=${tagId}`)}>
              {language === 'pt' ? 'Criar conta' : 'Sign up'}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/auth?tag=${tagId}`)}>
              {language === 'pt' ? 'Entrar' : 'Sign in'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Share Tag Modal */}
      <ShareTagModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tagId={tagId || ''}
        tagName={displayName}
      />

      {/* Task Detail Modal */}
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
        onRefresh={fetchTagDetails}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => {
          setCreateTaskOpen(false);
          setSubtaskParentId(undefined);
          fetchTagDetails();
        }}
        onSubmit={async (title, description, taskType, tagIds, deadline, imageUrl, priority, location) => {
          if (!user) return null;
          const insertData: any = {
            title,
            description,
            task_type: taskType,
            created_by: user.id,
            deadline: deadline || null,
            image_url: imageUrl || null,
            priority: priority || null,
            location: location || null,
          };
          if (subtaskParentId) {
            insertData.parent_task_id = subtaskParentId;
          }
          const { data, error } = await supabase
            .from('tasks')
            .insert(insertData)
            .select()
            .single();
          if (error || !data) return null;
          if (tagIds.length > 0) {
            await supabase.from('task_tags').insert(
              tagIds.map(tid => ({ task_id: data.id, tag_id: tid }))
            );
          }
          fetchTagDetails();
          return data as Task;
        }}
        preSelectedTags={tagId ? [tagId] : undefined}
      />

      {/* Create Product Modal */}
      <CreateProductModal
        open={createProductOpen}
        onClose={() => { setCreateProductOpen(false); setProductTaskId(undefined); fetchTagDetails(); }}
        onSubmit={async (title, description, productType, tagIds, quantity, imageUrl, priority, location) => {
          if (!user) return null;
          const { data, error } = await supabase
            .from('products')
            .insert({
              title,
              description,
              product_type: productType,
              created_by: user.id,
              quantity,
              image_url: imageUrl || null,
              priority: priority || null,
              location: location || null,
            })
            .select()
            .single();
          if (error || !data) return null;
          if (tagIds.length > 0) {
            await supabase.from('product_tags').insert(
              tagIds.map(tid => ({ product_id: data.id, tag_id: tid }))
            );
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

      {/* Create Poll Modal */}
      <CreatePollModal
        open={createPollOpen}
        onClose={() => { setCreatePollOpen(false); setPollTaskId(undefined); fetchTagDetails(); }}
        onSubmit={async (title, description, options, tagIds, deadline, allowNewOptions, taskIdParam, minQuorum, imageUrl) => {
          if (!user) return null;
          const { data, error } = await supabase
            .from('polls')
            .insert({
              title,
              description,
              created_by: user.id,
              deadline: deadline || null,
              allow_new_options: allowNewOptions ?? false,
              task_id: pollTaskId || taskIdParam || null,
              min_quorum: minQuorum || null,
              image_url: imageUrl || null,
            })
            .select()
            .single();
          if (error || !data) return null;
          if (options.length > 0) {
            await supabase.from('poll_options').insert(
              options.map(label => ({ poll_id: data.id, label, created_by: user.id }))
            );
          }
          if (tagIds.length > 0) {
            await supabase.from('poll_tags').insert(
              tagIds.map(tid => ({ poll_id: data.id, tag_id: tid }))
            );
          }
          fetchTagDetails();
          return data;
        }}
        taskId={pollTaskId}
        preSelectedTags={tagId ? [tagId] : undefined}
      />
    </div>
  );
}
