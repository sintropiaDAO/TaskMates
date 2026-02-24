import { useState, useEffect } from 'react';
import { GitBranch, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Task, Tag, Profile } from '@/types';

const MAX_VISIBLE_RELATED = 3;

interface RelatedTasksSectionProps {
  task: Task;
  onTaskClick: (task: Task) => void;
}

export function RelatedTasksSection({ task, onTaskClick }: RelatedTasksSectionProps) {
  const { language } = useLanguage();
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [siblingTasks, setSiblingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    fetchRelatedTasks();
  }, [task.id]);

  const enrichTasks = async (tasksData: any[]): Promise<Task[]> => {
    if (tasksData.length === 0) return [];
    
    const taskIds = tasksData.map(t => t.id);
    const creatorIds = [...new Set(tasksData.map(t => t.created_by))];

    const [tagsResult, profilesResult] = await Promise.all([
      supabase.from('task_tags').select('task_id, tag:tags(*)').in('task_id', taskIds),
      supabase.from('public_profiles').select('*').in('id', creatorIds)
    ]);

    const tagsByTask: Record<string, Tag[]> = {};
    tagsResult.data?.forEach(tt => {
      if (!tagsByTask[tt.task_id]) tagsByTask[tt.task_id] = [];
      if (tt.tag) tagsByTask[tt.task_id].push(tt.tag as Tag);
    });

    const profilesMap: Record<string, Profile> = {};
    profilesResult.data?.forEach(p => {
      profilesMap[p.id!] = p as unknown as Profile;
    });

    return tasksData.map(t => ({
      ...t,
      tags: tagsByTask[t.id] || [],
      creator: profilesMap[t.created_by],
    })) as Task[];
  };

  const fetchRelatedTasks = async () => {
    setLoading(true);

    // Fetch children (subtasks of this task)
    const { data: children } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', task.id)
      .order('created_at', { ascending: false });

    // Fetch parent task if this task has one
    let parent: Task | null = null;
    let siblings: Task[] = [];
    
    if (task.parent_task_id) {
      const { data: parentData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task.parent_task_id)
        .single();
      
      if (parentData) {
        const enrichedParent = await enrichTasks([parentData]);
        parent = enrichedParent[0] || null;
      }

      // Fetch siblings (other children of the same parent, excluding current)
      const { data: siblingsData } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', task.parent_task_id)
        .neq('id', task.id)
        .order('created_at', { ascending: false });
      
      if (siblingsData && siblingsData.length > 0) {
        siblings = await enrichTasks(siblingsData);
      }
    }

    const enrichedChildren = children ? await enrichTasks(children) : [];

    setParentTask(parent);
    setChildTasks(enrichedChildren);
    setSiblingTasks(siblings);
    setLoading(false);
  };

  const totalRelated = (parentTask ? 1 : 0) + childTasks.length + siblingTasks.length;
  
  if (loading) {
    return null; // Don't show anything while loading
  }

  if (totalRelated === 0) return null;

  const allRelated = [
    ...(parentTask ? [{ task: parentTask, label: language === 'pt' ? '🔼 Tarefa Mãe' : '🔼 Parent Task' }] : []),
    ...childTasks.map(t => ({ task: t, label: language === 'pt' ? '🔽 Subtarefa' : '🔽 Subtask' })),
    ...siblingTasks.map(t => ({ task: t, label: language === 'pt' ? '↔ Tarefa Irmã' : '↔ Sibling Task' })),
  ];

  const visibleRelated = allRelated.slice(0, MAX_VISIBLE_RELATED);
  const hasMore = allRelated.length > MAX_VISIBLE_RELATED;

  return (
    <>
      <div className="py-4 border-b border-border">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          {language === 'pt' ? 'Tarefas Relacionadas' : 'Related Tasks'} ({totalRelated})
        </h4>
        
        <div className="space-y-2">
          {visibleRelated.map(({ task: relatedTask, label }) => (
            <div key={relatedTask.id} className="relative">
              <span className="text-[10px] text-muted-foreground font-medium absolute -top-1 left-2 bg-card px-1 z-10">
                {label}
              </span>
              <TaskCardMini
                task={relatedTask}
                onClick={() => onTaskClick(relatedTask)}
                completionDate={relatedTask.status === 'completed' ? relatedTask.updated_at : undefined}
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-1 mt-2"
            onClick={() => setShowAllModal(true)}
          >
            <ChevronDown className="w-4 h-4" />
            {language === 'pt' ? `Ver mais (${allRelated.length - MAX_VISIBLE_RELATED})` : `See more (${allRelated.length - MAX_VISIBLE_RELATED})`}
          </Button>
        )}
      </div>

      {/* Full hierarchy modal */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              {language === 'pt' ? 'Hierarquia de Tarefas' : 'Task Hierarchy'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Parent */}
            {parentTask && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {language === 'pt' ? '🔼 Tarefa Mãe' : '🔼 Parent Task'}
                </p>
                <TaskCardMini
                  task={parentTask}
                  onClick={() => { setShowAllModal(false); onTaskClick(parentTask); }}
                  completionDate={parentTask.status === 'completed' ? parentTask.updated_at : undefined}
                />
              </div>
            )}

            {/* Current task indicator */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1">
                {language === 'pt' ? '📌 Tarefa Atual' : '📌 Current Task'}
              </p>
              <p className="text-sm font-medium">{task.title}</p>
            </div>

            {/* Children */}
            {childTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {language === 'pt' ? `🔽 Subtarefas (${childTasks.length})` : `🔽 Subtasks (${childTasks.length})`}
                </p>
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  {childTasks.map(child => (
                    <TaskCardMini
                      key={child.id}
                      task={child}
                      onClick={() => { setShowAllModal(false); onTaskClick(child); }}
                      completionDate={child.status === 'completed' ? child.updated_at : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Siblings */}
            {siblingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {language === 'pt' ? `↔ Tarefas Irmãs (${siblingTasks.length})` : `↔ Sibling Tasks (${siblingTasks.length})`}
                </p>
                <div className="space-y-2">
                  {siblingTasks.map(sibling => (
                    <TaskCardMini
                      key={sibling.id}
                      task={sibling}
                      onClick={() => { setShowAllModal(false); onTaskClick(sibling); }}
                      completionDate={sibling.status === 'completed' ? sibling.updated_at : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
