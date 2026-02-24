import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Tag as TagIcon, User, ListTodo, Calendar as CalendarIcon, Trash2, Loader2,
  UserPlus, UserMinus, ArrowLeft, Plus, Search, ChevronDown, ChevronUp, MapPin, List,
  Image as ImageIcon, Share2, LogIn, Settings
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { Calendar } from '@/components/ui/calendar';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
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
import { Task, Tag, Profile } from '@/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'open' | 'completed';
type ViewMode = 'list' | 'calendar';

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
  const [relatedProfiles, setRelatedProfiles] = useState<RelatedProfile[]>([]);
  const [creator, setCreator] = useState<TagCreator | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [communitySettings, setCommunitySettings] = useState<{
    header_image_url: string | null;
    logo_url: string | null;
    logo_emoji: string | null;
    is_hidden: boolean;
  } | null>(null);

  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isFollowingTag = userTags.some(ut => ut.tag_id === tagId);
  const tag = tags.find(t => t.id === tagId) || tagData;

  useEffect(() => {
    if (tagId) {
      fetchTagDetails();
    }
  }, [tagId]);

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
            .select('header_image_url, logo_url, logo_emoji, is_hidden')
            .eq('tag_id', tagId)
            .maybeSingle();
          if (cs) setCommunitySettings(cs);
        }
      }

      // Fetch related tasks with creator info
      const { data: taskTags } = await supabase
        .from('task_tags')
        .select('task_id')
        .eq('tag_id', tagId);

      if (taskTags && taskTags.length > 0) {
        const taskIds = taskTags.map(tt => tt.task_id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .in('id', taskIds)
          .order('created_at', { ascending: false });

        if (tasks) {
          // Fetch creator profiles
          const creatorIds = [...new Set(tasks.map(t => t.created_by))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', creatorIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          const tasksWithCreator = tasks.map(t => ({
            ...t,
            creator: profileMap.get(t.created_by) as Profile | undefined
          })) as Task[];

          setRelatedTasks(tasksWithCreator);
        }
      } else {
        setRelatedTasks([]);
      }

      // Fetch related profiles
      const { data: userTagsData } = await supabase
        .from('user_tags')
        .select('user_id')
        .eq('tag_id', tagId);

      if (userTagsData && userTagsData.length > 0) {
        const userIds = userTagsData.map(ut => ut.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        setRelatedProfiles(profiles || []);
      } else {
        setRelatedProfiles([]);
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

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let tasks = relatedTasks;

    // Status filter
    if (statusFilter === 'open') {
      tasks = tasks.filter(t => t.status !== 'completed');
    } else if (statusFilter === 'completed') {
      tasks = tasks.filter(t => t.status === 'completed');
    }

    // Search by name, location, or person
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.creator?.full_name?.toLowerCase().includes(q)
      );
    }

    return tasks;
  }, [relatedTasks, statusFilter, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => ({
    all: relatedTasks.length,
    open: relatedTasks.filter(t => t.status !== 'completed').length,
    completed: relatedTasks.filter(t => t.status === 'completed').length,
  }), [relatedTasks]);

  // Calendar: tasks with deadlines grouped by date
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

  // Tasks for selected date in calendar
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTasks.filter(t =>
      t.deadline && isSameDay(new Date(t.deadline), selectedDate)
    );
  }, [filteredTasks, selectedDate]);

  // Calendar modifiers for days with tasks
  const daysWithTasks = useMemo(() => {
    return filteredTasks
      .filter(t => t.deadline)
      .map(t => new Date(t.deadline!));
  }, [filteredTasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

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
    : (language === 'pt' ? 'Comunidade' : 'Community');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
            <div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <TagBadge name={tag.name} category={tag.category} size="md" displayName={displayName} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
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
            {isAdmin && (
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

      {/* Creator Info */}
      {(creator || tag.created_at) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-lg p-4 space-y-2"
        >
          <h4 className="font-medium text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('createdBy')}
          </h4>
          <div className="flex items-center gap-3 flex-wrap">
            {creator && (
              <button
                onClick={() => handleProfileClick(creator.id)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={creator.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {creator.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hover:underline">{creator.full_name || t('anonymous')}</span>
              </button>
            )}
            {tag.created_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {format(new Date(tag.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Related Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {t('relatedTasks')} ({statusCounts.all})
          </h3>
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
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            className="text-xs h-7 px-2"
            onClick={() => setStatusFilter('all')}
          >
            {t('filterAllTasks')} ({statusCounts.all})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'open' ? 'default' : 'ghost'}
            className="text-xs h-7 px-2"
            onClick={() => setStatusFilter('open')}
          >
            {t('taskOpen')} ({statusCounts.open})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'completed' ? 'default' : 'ghost'}
            className="text-xs h-7 px-2"
            onClick={() => setStatusFilter('completed')}
          >
            {t('taskCompleted')} ({statusCounts.completed})
          </Button>
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
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setCreateTaskOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('dashboardCreateTask')}
        </Button>

        {viewMode === 'list' ? (
          /* List View */
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
          /* Calendar View */
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
                    <TaskCardMini
                      key={task.id}
                      task={task}
                      onClick={() => handleTaskClick(task)}
                    />
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
      </motion.div>

      {/* Related Profiles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
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

      {/* Media Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
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
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => {
          setCreateTaskOpen(false);
          fetchTagDetails();
        }}
        onSubmit={async (title, description, taskType, tagIds, deadline, imageUrl, priority, location) => {
          if (!user) return null;
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              title,
              description,
              task_type: taskType,
              created_by: user.id,
              deadline: deadline || null,
              image_url: imageUrl || null,
              priority: priority || null,
              location: location || null,
            })
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
    </div>
  );
}
