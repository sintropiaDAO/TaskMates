import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag as TagIcon, User, ListTodo, Calendar, Trash2, Loader2, UserPlus, UserMinus, BarChart3 } from 'lucide-react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types';

interface TagDetailModalProps {
  tagId: string | null;
  tagName: string;
  tagCategory: 'skills' | 'communities';
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

interface RelatedTask {
  id: string;
  title: string;
  task_type: string;
  status: string;
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

interface RelatedPoll {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

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
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState<RelatedTask[]>([]);
  const [relatedProfiles, setRelatedProfiles] = useState<RelatedProfile[]>([]);
  const [relatedPolls, setRelatedPolls] = useState<RelatedPoll[]>([]);
  const [creator, setCreator] = useState<TagCreator | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFollowingTag, setIsFollowingTag] = useState(false);
  const [pollFilter, setPollFilter] = useState<'all' | 'active' | 'closed'>('all');

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

      // Fetch related tasks, profiles, and polls in parallel
      const [taskTagsRes, userTagsRes, pollTagsRes] = await Promise.all([
        supabase.from('task_tags').select('task_id').eq('tag_id', tagId),
        supabase.from('user_tags').select('user_id').eq('tag_id', tagId),
        supabase.from('poll_tags').select('poll_id').eq('tag_id', tagId),
      ]);

      // Fetch tasks
      if (taskTagsRes.data && taskTagsRes.data.length > 0) {
        const taskIds = taskTagsRes.data.map(tt => tt.task_id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, task_type, status')
          .in('id', taskIds)
          .limit(10);
        setRelatedTasks(tasks || []);
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
          .select('id, title, status, deadline')
          .in('id', pollIds)
          .order('created_at', { ascending: false })
          .limit(20);
        setRelatedPolls(polls || []);
      } else {
        setRelatedPolls([]);
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
      setSelectedTask(data as Task);
    }
  };

  const handleProfileClick = (profileId: string) => {
    onClose();
    navigate(`/profile/${profileId}`);
  };

  const dateLocale = language === 'pt' ? ptBR : enUS;

  // Poll filtering and counting
  const activePolls = useMemo(() => relatedPolls.filter(p => p.status === 'active'), [relatedPolls]);
  const closedPolls = useMemo(() => relatedPolls.filter(p => p.status !== 'active'), [relatedPolls]);
  
  const filteredPolls = useMemo(() => {
    if (pollFilter === 'active') return activePolls;
    if (pollFilter === 'closed') return closedPolls;
    return relatedPolls;
  }, [relatedPolls, activePolls, closedPolls, pollFilter]);

  const isPollExpired = (poll: RelatedPoll) => {
    if (!poll.deadline) return false;
    return new Date(poll.deadline) < new Date();
  };

  const getPollStatus = (poll: RelatedPoll) => {
    if (poll.status !== 'active' || isPollExpired(poll)) {
      return { label: t('pollStatusClosed'), className: 'bg-muted text-muted-foreground' };
    }
    return { label: t('pollStatusActive'), className: 'bg-primary/10 text-primary' };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-primary" />
              {t('tagDetails')}
            </DialogTitle>
          </DialogHeader>

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

                {/* Related Tasks */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <ListTodo className="w-4 h-4" />
                    {t('relatedTasks')} ({relatedTasks.length})
                  </h4>
                  {relatedTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noRelatedTasks')}</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedTasks.map(task => (
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
                </div>

                {/* Related Polls */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t('relatedPolls')} ({relatedPolls.length})
                  </h4>
                  
                  {relatedPolls.length > 0 && (
                    <div className="flex gap-1">
                      {([
                        { key: 'all' as const, label: t('pollsAll'), count: relatedPolls.length },
                        { key: 'active' as const, label: t('pollsVoting'), count: activePolls.length },
                        { key: 'closed' as const, label: t('pollsClosed'), count: closedPolls.length },
                      ]).map(filter => (
                        <button
                          key={filter.key}
                          onClick={() => setPollFilter(filter.key)}
                          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                            pollFilter === filter.key
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      ))}
                    </div>
                  )}

                  {relatedPolls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noRelatedPolls')}</p>
                  ) : filteredPolls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noRelatedPolls')}</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredPolls.map(poll => {
                        const status = getPollStatus(poll);
                        return (
                          <div 
                            key={poll.id} 
                            className="w-full p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                          >
                            <span className="text-sm truncate flex-1">{poll.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                        );
                      })}
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
        </DialogContent>
      </Dialog>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
