import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Target, TrendingUp, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { isToday, isThisMonth, isBefore, startOfDay, endOfDay, endOfMonth } from 'date-fns';

interface MyTasksSectionProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

type TimeFilter = 'today' | 'month' | 'all';
type ImpactFilter = 'all' | 'personal' | 'creator' | 'collaborator' | 'requester';

const MAX_VISIBLE_TASKS = 5;

export function MyTasksSection({ tasks, onTaskClick }: MyTasksSectionProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // User collaboration/request data
  const [collaboratingTaskIds, setCollaboratingTaskIds] = useState<Set<string>>(new Set());
  const [requestingTaskIds, setRequestingTaskIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [actionPlanFilter, setActionPlanFilter] = useState<TimeFilter>('all');
  const [demandsFilter, setDemandsFilter] = useState<TimeFilter>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  
  // Show more states
  const [showAllActionPlan, setShowAllActionPlan] = useState(false);
  const [showAllDemands, setShowAllDemands] = useState(false);
  const [showAllImpact, setShowAllImpact] = useState(false);

  // Fetch user's collaboration and request status
  useEffect(() => {
    const fetchUserCollaborations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: collaborations } = await supabase
          .from('task_collaborators')
          .select('task_id, status')
          .eq('user_id', user.id)
          .eq('approval_status', 'approved');
        
        if (collaborations) {
          const collaboratorIds = new Set<string>();
          const requesterIds = new Set<string>();
          
          collaborations.forEach(c => {
            if (c.status === 'collaborate') {
              collaboratorIds.add(c.task_id);
            } else if (c.status === 'request') {
              requesterIds.add(c.task_id);
            }
          });
          
          setCollaboratingTaskIds(collaboratorIds);
          setRequestingTaskIds(requesterIds);
        }
      } catch (error) {
        console.error('Error fetching collaborations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCollaborations();
  }, [user]);

  // Filter by deadline
  const filterByDeadline = (taskList: Task[], filter: TimeFilter): Task[] => {
    if (filter === 'today') {
      return taskList.filter(t => t.deadline && isToday(new Date(t.deadline)));
    }
    if (filter === 'month') {
      return taskList.filter(t => t.deadline && isThisMonth(new Date(t.deadline)));
    }
    // 'all' - sort by deadline (closest/overdue first)
    return [...taskList].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  };

  // ACTION PLAN: Open tasks (offer + personal created by user) + open offers where user is approved collaborator
  const actionPlanTasks = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'completed');
    
    // Tasks created by user of type offer or personal
    const createdOfferPersonal = openTasks.filter(t => 
      t.created_by === user?.id && (t.task_type === 'offer' || t.task_type === 'personal')
    );
    
    // Open offers where user is approved collaborator
    const collaboratingOffers = openTasks.filter(t => 
      t.task_type === 'offer' && 
      t.created_by !== user?.id &&
      collaboratingTaskIds.has(t.id)
    );
    
    // Combine without duplicates
    const combined = [...createdOfferPersonal];
    collaboratingOffers.forEach(t => {
      if (!combined.find(c => c.id === t.id)) {
        combined.push(t);
      }
    });
    
    return filterByDeadline(combined, actionPlanFilter);
  }, [tasks, user?.id, collaboratingTaskIds, actionPlanFilter]);

  // DEMANDS: Open tasks (request created by user) + open offers where user is approved requester
  const demandsTasks = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'completed');
    
    // Tasks created by user of type request
    const createdRequests = openTasks.filter(t => 
      t.created_by === user?.id && t.task_type === 'request'
    );
    
    // Open offers where user is approved requester
    const requestingOffers = openTasks.filter(t => 
      t.task_type === 'offer' && 
      t.created_by !== user?.id &&
      requestingTaskIds.has(t.id)
    );
    
    // Combine without duplicates
    const combined = [...createdRequests];
    requestingOffers.forEach(t => {
      if (!combined.find(c => c.id === t.id)) {
        combined.push(t);
      }
    });
    
    return filterByDeadline(combined, demandsFilter);
  }, [tasks, user?.id, requestingTaskIds, demandsFilter]);

  // IMPACT: Completed tasks where user is creator, collaborator, or requester
  const impactTasks = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    if (impactFilter === 'all') {
      // All completed tasks where user participated (creator, collaborator, or requester)
      return completedTasks.filter(t => 
        t.created_by === user?.id || 
        collaboratingTaskIds.has(t.id) || 
        requestingTaskIds.has(t.id)
      );
    }
    if (impactFilter === 'personal') {
      // Only personal tasks created by user
      return completedTasks.filter(t => 
        t.created_by === user?.id && t.task_type === 'personal'
      );
    }
    if (impactFilter === 'creator') {
      return completedTasks.filter(t => t.created_by === user?.id);
    }
    if (impactFilter === 'collaborator') {
      return completedTasks.filter(t => 
        t.created_by !== user?.id && collaboratingTaskIds.has(t.id)
      );
    }
    // requester
    return completedTasks.filter(t => 
      t.created_by !== user?.id && requestingTaskIds.has(t.id)
    );
  }, [tasks, user?.id, collaboratingTaskIds, requestingTaskIds, impactFilter]);

  const renderFilterButtons = (
    currentFilter: TimeFilter,
    setFilter: (f: TimeFilter) => void
  ) => (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant={currentFilter === 'today' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setFilter('today')}
      >
        {t('filterToday')}
      </Button>
      <Button
        size="sm"
        variant={currentFilter === 'month' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setFilter('month')}
      >
        {t('filterMonth')}
      </Button>
      <Button
        size="sm"
        variant={currentFilter === 'all' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setFilter('all')}
      >
        {t('filterAllTasks')}
      </Button>
    </div>
  );

  const renderImpactFilterButtons = () => (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        variant={impactFilter === 'all' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('all')}
      >
        {t('filterAllTasks')}
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'personal' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('personal')}
      >
        {t('filterPersonal')}
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'creator' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('creator')}
      >
        {t('filterCreator')}
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'collaborator' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('collaborator')}
      >
        {t('filterCollaborator')}
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'requester' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('requester')}
      >
        {t('filterRequester')}
      </Button>
    </div>
  );

  const renderTaskList = (
    taskList: Task[],
    showAll: boolean,
    setShowAll: (v: boolean) => void,
    emptyMessage: string
  ) => {
    if (taskList.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
      );
    }

    const visibleTasks = showAll ? taskList : taskList.slice(0, MAX_VISIBLE_TASKS);
    const hasMore = taskList.length > MAX_VISIBLE_TASKS;

    return (
      <div className="space-y-2">
        {visibleTasks.map(task => (
          <TaskCardMini key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-1"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('showLess')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('showMore')} ({taskList.length - MAX_VISIBLE_TASKS})
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Plan */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-success" />
              {t('actionPlan')}
            </CardTitle>
            {renderFilterButtons(actionPlanFilter, setActionPlanFilter)}
          </div>
          <p className="text-xs text-muted-foreground">{t('actionPlanDescription')}</p>
        </CardHeader>
        <CardContent>
          {renderTaskList(
            actionPlanTasks,
            showAllActionPlan,
            setShowAllActionPlan,
            t('noActionPlanTasks')
          )}
        </CardContent>
      </Card>

      {/* Demands */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-pink-500" />
              {t('demands')}
            </CardTitle>
            {renderFilterButtons(demandsFilter, setDemandsFilter)}
          </div>
          <p className="text-xs text-muted-foreground">{t('demandsDescription')}</p>
        </CardHeader>
        <CardContent>
          {renderTaskList(
            demandsTasks,
            showAllDemands,
            setShowAllDemands,
            t('noDemandsTasks')
          )}
        </CardContent>
      </Card>

      {/* Impact */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('impact')}
            </CardTitle>
            {renderImpactFilterButtons()}
          </div>
          <p className="text-xs text-muted-foreground">{t('impactDescription')}</p>
        </CardHeader>
        <CardContent>
          {renderTaskList(
            impactTasks,
            showAllImpact,
            setShowAllImpact,
            t('noImpactTasks')
          )}
        </CardContent>
      </Card>
    </div>
  );
}
