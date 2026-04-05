import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Target, TrendingUp, ChevronDown, ChevronUp, Loader2, Package, BarChart3, Tags, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { MyProductsSection } from '@/components/dashboard/MyProductsSection';
import { MyPollsSection } from '@/components/dashboard/MyPollsSection';
import { MyTagsSection } from '@/components/dashboard/MyTagsSection';
import { MyCalendarView } from '@/components/dashboard/MyCalendarView';
import { CoinDashboard } from '@/components/gamification/CoinDashboard';
import { ProfileVisibilityToggle } from '@/components/profile/ProfileVisibilityToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileVisibility } from '@/hooks/useProfileVisibility';
import { Task, Product, Poll, UserTag } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { isToday, isThisMonth, isBefore, startOfDay, endOfDay, endOfMonth } from 'date-fns';

import { PollHistoryEntry } from '@/hooks/usePolls';

interface MyTasksSectionProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  products: Product[];
  onProductClick: (product: Product) => void;
  polls: Poll[];
  onVotePoll: (pollId: string, optionId: string) => Promise<any>;
  onAddPollOption: (pollId: string, label: string) => Promise<any>;
  onEditPoll: (poll: Poll) => void;
  onDeletePoll: (pollId: string) => void;
  onRemoveVote: (pollId: string) => void;
  onFetchPollHistory: (pollId: string) => Promise<PollHistoryEntry[]>;
  onPollClick?: (poll: Poll) => void;
  isNewItem?: (sectionKey: string, createdAt: string | null | undefined) => boolean;
  markVisited?: (sectionKey: string) => void;
  userTags?: UserTag[];
  getTranslatedName?: (tag: { id: string; name: string; category: string }) => string;
  initialTab?: MyTab;
}

type MyTab = 'tasks' | 'products' | 'polls' | 'tags' | 'calendar';

type TimeFilter = 'today' | 'month' | 'all';
type ImpactFilter = 'all' | 'personal' | 'creator' | 'collaborator' | 'requester';

const MAX_VISIBLE_TASKS = 5;

export function MyTasksSection({ tasks, onTaskClick, products, onProductClick, polls, onVotePoll, onAddPollOption, onEditPoll, onDeletePoll, onRemoveVote, onFetchPollHistory, onPollClick, isNewItem, markVisited, userTags, getTranslatedName, initialTab }: MyTasksSectionProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { settings, toggleSection } = useProfileVisibility();
  const [activeTab, setActiveTab] = useState<MyTab>(initialTab || 'tasks');

  // Sync with external initialTab changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Mark sub-tab section as visited when switching tabs
  const tabSectionKeyMap: Record<MyTab, string> = {
    tasks: 'my_tasks_tab',
    products: 'my_products_tab',
    polls: 'my_polls_tab',
    tags: 'my_tags_tab',
  };

  useEffect(() => {
    if (markVisited) {
      markVisited(tabSectionKeyMap[activeTab]);
    }
  }, [activeTab, markVisited]);
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

  // Count tasks by deadline filter (for Action Plan base tasks)
  const getActionPlanBaseTasks = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'completed');
    const createdOfferPersonal = openTasks.filter(t => 
      t.created_by === user?.id && (t.task_type === 'offer' || t.task_type === 'personal')
    );
    const collaboratingOffers = openTasks.filter(t => 
      t.task_type === 'offer' && 
      t.created_by !== user?.id &&
      collaboratingTaskIds.has(t.id)
    );
    const combined = [...createdOfferPersonal];
    collaboratingOffers.forEach(t => {
      if (!combined.find(c => c.id === t.id)) {
        combined.push(t);
      }
    });
    return combined;
  }, [tasks, user?.id, collaboratingTaskIds]);

  // Count tasks by deadline filter (for Demands base tasks)
  const getDemandsBaseTasks = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'completed');
    const createdRequests = openTasks.filter(t => 
      t.created_by === user?.id && t.task_type === 'request'
    );
    const requestingOffers = openTasks.filter(t => 
      t.task_type === 'offer' && 
      t.created_by !== user?.id &&
      requestingTaskIds.has(t.id)
    );
    const combined = [...createdRequests];
    requestingOffers.forEach(t => {
      if (!combined.find(c => c.id === t.id)) {
        combined.push(t);
      }
    });
    return combined;
  }, [tasks, user?.id, requestingTaskIds]);

  // Counts for Action Plan filters
  const actionPlanCounts = useMemo(() => ({
    today: getActionPlanBaseTasks.filter(t => t.deadline && isToday(new Date(t.deadline))).length,
    month: getActionPlanBaseTasks.filter(t => t.deadline && isThisMonth(new Date(t.deadline))).length,
    all: getActionPlanBaseTasks.length
  }), [getActionPlanBaseTasks]);

  // Counts for Demands filters
  const demandsCounts = useMemo(() => ({
    today: getDemandsBaseTasks.filter(t => t.deadline && isToday(new Date(t.deadline))).length,
    month: getDemandsBaseTasks.filter(t => t.deadline && isThisMonth(new Date(t.deadline))).length,
    all: getDemandsBaseTasks.length
  }), [getDemandsBaseTasks]);

  // Base completed tasks for Impact counts
  const getImpactBaseTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'completed');
  }, [tasks]);

  // Counts for Impact filters
  const impactCounts = useMemo(() => ({
    all: getImpactBaseTasks.filter(t => 
      t.created_by === user?.id || 
      collaboratingTaskIds.has(t.id) || 
      requestingTaskIds.has(t.id)
    ).length,
    personal: getImpactBaseTasks.filter(t => 
      t.created_by === user?.id && t.task_type === 'personal'
    ).length,
    creator: getImpactBaseTasks.filter(t => t.created_by === user?.id).length,
    collaborator: getImpactBaseTasks.filter(t => 
      t.created_by !== user?.id && collaboratingTaskIds.has(t.id)
    ).length,
    requester: getImpactBaseTasks.filter(t => 
      t.created_by !== user?.id && requestingTaskIds.has(t.id)
    ).length
  }), [getImpactBaseTasks, user?.id, collaboratingTaskIds, requestingTaskIds]);

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
    setFilter: (f: TimeFilter) => void,
    counts: { today: number; month: number; all: number }
  ) => (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant={currentFilter === 'today' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setFilter('today')}
      >
        {t('filterToday')} ({counts.today})
      </Button>
      <Button
        size="sm"
        variant={currentFilter === 'month' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setFilter('month')}
      >
        {t('filterMonth')} ({counts.month})
      </Button>
      <Button
        size="sm"
        variant={currentFilter === 'all' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setFilter('all')}
      >
        {t('filterAllTasks')} ({counts.all})
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
        {t('filterAllTasks')} ({impactCounts.all})
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'personal' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('personal')}
      >
        {t('filterPersonal')} ({impactCounts.personal})
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'creator' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('creator')}
      >
        {t('filterCreator')} ({impactCounts.creator})
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'collaborator' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('collaborator')}
      >
        {t('filterCollaborator')} ({impactCounts.collaborator})
      </Button>
      <Button
        size="sm"
        variant={impactFilter === 'requester' ? 'default' : 'ghost'}
        className="text-xs h-7 px-2"
        onClick={() => setImpactFilter('requester')}
      >
        {t('filterRequester')} ({impactCounts.requester})
      </Button>
    </div>
  );

  const renderTaskList = (
    taskList: Task[],
    showAll: boolean,
    setShowAll: (v: boolean) => void,
    emptyMessage: string,
    extraProps?: (task: Task) => Record<string, unknown>
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
          <TaskCardMini key={task.id} task={task} onClick={() => { markVisited?.('mytasks'); onTaskClick(task); }} isNew={isNewItem?.('mytasks', task.created_at)} {...extraProps?.(task)} />
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

  // Check if internal tabs have new items
  const hasNewTasks = tasks.some(t => isNewItem?.('my_tasks_tab', t.created_at));
  const hasNewProducts = products.some(p => isNewItem?.('my_products_tab', p.created_at));
  const hasNewPolls = polls.some(p => isNewItem?.('my_polls_tab', p.created_at));

  const tabItems: { key: MyTab; label: string; icon: React.ReactNode; hasNew: boolean }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', icon: <ClipboardList className="w-3.5 h-3.5" />, hasNew: hasNewTasks },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', icon: <Package className="w-3.5 h-3.5" />, hasNew: hasNewProducts },
    { key: 'polls', label: language === 'pt' ? 'Enquetes' : 'Polls', icon: <BarChart3 className="w-3.5 h-3.5" />, hasNew: hasNewPolls },
    { key: 'tags', label: 'Tags', icon: <Tags className="w-3.5 h-3.5" />, hasNew: false },
    { key: 'calendar', label: language === 'pt' ? 'Calendário' : 'Calendar', icon: <CalendarIcon className="w-3.5 h-3.5" />, hasNew: false },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Menu */}
      <div className="grid grid-cols-4 gap-1">
        {tabItems.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
            {tab.hasNew && activeTab !== tab.key && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse ml-1" />
            )}
          </button>
        ))}
      </div>


      {/* Tab Content */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Action Plan */}
          <Card className="glass">
            <CardHeader className="pb-3">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="w-5 h-5 text-success" />
                  {t('actionPlan')}
                  <ProfileVisibilityToggle
                    visible={settings.show_my_action_plan}
                    onToggle={() => toggleSection('show_my_action_plan')}
                  />
                </CardTitle>
                <div className="flex items-center gap-1">
                  {renderFilterButtons(actionPlanFilter, setActionPlanFilter, actionPlanCounts)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('actionPlanDescription')}</p>
            </CardHeader>
            <CardContent>
              {renderTaskList(actionPlanTasks, showAllActionPlan, setShowAllActionPlan, t('noActionPlanTasks'))}
            </CardContent>
          </Card>

          {/* Demands */}
          <Card className="glass">
            <CardHeader className="pb-3">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-pink-500" />
                  {t('demands')}
                  <ProfileVisibilityToggle
                    visible={settings.show_my_demands}
                    onToggle={() => toggleSection('show_my_demands')}
                  />
                </CardTitle>
                <div className="flex items-center gap-1">
                  {renderFilterButtons(demandsFilter, setDemandsFilter, demandsCounts)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('demandsDescription')}</p>
            </CardHeader>
            <CardContent>
              {renderTaskList(demandsTasks, showAllDemands, setShowAllDemands, t('noDemandsTasks'))}
            </CardContent>
          </Card>

          {/* Impact */}
          <Card className="glass">
            <CardHeader className="pb-3">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {t('impact')}
                  <ProfileVisibilityToggle
                    visible={settings.show_my_impact}
                    onToggle={() => toggleSection('show_my_impact')}
                  />
                </CardTitle>
                <div className="flex items-center gap-1">
                  {renderImpactFilterButtons()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('impactDescription')}</p>
            </CardHeader>
            <CardContent>
              {renderTaskList(impactTasks, showAllImpact, setShowAllImpact, t('noImpactTasks'), (task) => ({ completionDate: task.updated_at }))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'products' && (
        <MyProductsSection products={products} onProductClick={onProductClick} isNewItem={isNewItem} markVisited={markVisited} />
      )}

      {activeTab === 'polls' && (
        <MyPollsSection 
          polls={polls} 
          onVote={onVotePoll} 
          onAddOption={onAddPollOption}
          onEdit={onEditPoll}
          onDelete={onDeletePoll}
          onRemoveVote={onRemoveVote}
          onFetchHistory={onFetchPollHistory}
          onPollClick={onPollClick}
        />
      )}

      {activeTab === 'tags' && userTags && (
        <MyTagsSection userTags={userTags} getTranslatedName={getTranslatedName} />
      )}
    </div>
  );
}
