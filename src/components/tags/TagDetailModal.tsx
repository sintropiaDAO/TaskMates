import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag as TagIcon, User, ListTodo, Calendar, Trash2, Loader2 } from 'lucide-react';
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
import { useAdmin } from '@/hooks/useAdmin';
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

export function TagDetailModal({
  tagId,
  tagName,
  tagCategory,
  open,
  onClose,
  onDeleted,
}: TagDetailModalProps) {
  const { t, language } = useLanguage();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState<RelatedTask[]>([]);
  const [relatedProfiles, setRelatedProfiles] = useState<RelatedProfile[]>([]);
  const [creator, setCreator] = useState<TagCreator | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (open && tagId) {
      fetchTagDetails();
    }
  }, [open, tagId]);

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

      // Fetch related tasks
      const { data: taskTags } = await supabase
        .from('task_tags')
        .select('task_id')
        .eq('tag_id', tagId);

      if (taskTags && taskTags.length > 0) {
        const taskIds = taskTags.map(tt => tt.task_id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, task_type, status')
          .in('id', taskIds)
          .limit(10);
        
        setRelatedTasks(tasks || []);
      } else {
        setRelatedTasks([]);
      }

      // Fetch related profiles
      const { data: userTags } = await supabase
        .from('user_tags')
        .select('user_id')
        .eq('tag_id', tagId);

      if (userTags && userTags.length > 0) {
        const userIds = userTags.map(ut => ut.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds)
          .limit(10);
        
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
            <div className="flex items-center justify-between">
              <TagBadge name={tagName} category={tagCategory} size="md" />
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
