import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Plus, Tag, CheckCircle, ListTodo, Edit, 
  Calendar, ChevronRight, Users, Activity, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { TagsManager } from '@/components/tags/TagsManager';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { PendingRatingsSection } from '@/components/dashboard/PendingRatingsSection';
import { ReportModal } from '@/components/dashboard/ReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTasks } from '@/hooks/useTasks';
import { useTags } from '@/hooks/useTags';
import { useTaskCollaborators } from '@/hooks/useTaskCollaborators';
import { useFollows } from '@/hooks/useFollows';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const { 
    tasks, 
    loading: tasksLoading, 
    createTask, 
    updateTask,
    completeTask,
    deleteTask,
    getRecommendedTasks,
    getFollowingTasks,
    getUserTasks,
    getCompletedUserTasks,
    refreshTasks 
  } = useTasks();
  const { userTags } = useTags();
  const { 
    fetchCollaboratorCounts, 
    addCollaborator, 
    getCountsForTask 
  } = useTaskCollaborators();
  const { followingIds } = useFollows();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch collaborator counts when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      fetchCollaboratorCounts(taskIds);
    }
  }, [tasks, fetchCollaboratorCounts]);

  // Handle task URL parameter to open task modal
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        // Clear the URL parameter after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tasks, setSearchParams]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  const userTagIds = userTags.map(ut => ut.tag_id);
  const recommendedTasks = getRecommendedTasks(userTagIds);
  const followingTasks = getFollowingTasks(followingIds);
  const myTasks = getUserTasks();
  const completedTasks = getCompletedUserTasks();

  const handleCreateTask = async (
    title: string,
    description: string,
    taskType: 'offer' | 'request',
    tagIds: string[],
    deadline?: string
  ) => {
    if (editingTask) {
      const success = await updateTask(editingTask.id, { 
        title, 
        description, 
        task_type: taskType, 
        deadline: deadline || null 
      }, tagIds);
      if (success) {
        toast({ title: t('dashboardTaskUpdated') });
        setEditingTask(null);
        return editingTask;
      }
      return null;
    }
    
    const task = await createTask(title, description, taskType, tagIds, deadline);
    if (task) {
      toast({ title: t('dashboardTaskCreated') });
    }
    return task;
  };

  const handleCompleteTask = async (taskId: string, proofUrl: string, proofType: string) => {
    const result = await completeTask(taskId, proofUrl, proofType);
    return result;
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowCreateModal(true);
  };

  const handleCollaborate = async (task: Task) => {
    const result = await addCollaborator(task.id, 'collaborate', task.created_by, task.title);
    if (result.success) {
      toast({ title: t('taskCollaborationSent') });
    } else if (result.error === 'already_exists') {
      toast({ title: t('taskAlreadyCollaborated') });
    }
  };

  const handleRequest = async (task: Task) => {
    const result = await addCollaborator(task.id, 'request', task.created_by, task.title);
    if (result.success) {
      toast({ title: t('taskRequestSent') });
    } else if (result.error === 'already_exists') {
      toast({ title: t('taskAlreadyRequested') });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold mb-2">
            {t('dashboardHello')}, {profile?.full_name?.split(' ')[0] || t('user')}! 👋
          </h1>
          <p className="text-muted-foreground">
            {t('dashboardWelcomeMessage')}
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => {
              setEditingTask(null);
              setShowCreateModal(true);
            }}
          >
            <Plus className="w-6 h-6 text-icon" />
            <span>{t('dashboardCreateTask')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setShowTagsModal(true)}
          >
            <Tag className="w-6 h-6 text-icon-secondary" />
            <span>{t('dashboardCreateTags')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/profile/edit')}
          >
            <Edit className="w-6 h-6 text-icon" />
            <span>{t('dashboardEditProfile')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setShowReportModal(true)}
          >
            <FileText className="w-6 h-6 text-icon" />
            <span>{t('dashboardReport')}</span>
          </Button>
        </motion.div>

        {/* Pending Ratings Section */}
        <PendingRatingsSection onTaskClick={(task) => setSelectedTask(task)} />

        {/* Tabs */}
        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="recommendations" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dashboardRecommended')}</span>
              <span className="sm:hidden">Rec.</span>
            </TabsTrigger>
            <TabsTrigger value="feed" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">{t('activityFeed')}</span>
              <span className="sm:hidden">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dashboardFollowingTasks')}</span>
              <span className="sm:hidden">Seg.</span>
            </TabsTrigger>
            <TabsTrigger value="mytasks" className="gap-2">
              <ListTodo className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dashboardMyTasks')}</span>
              <span className="sm:hidden">My</span>
            </TabsTrigger>
            <TabsTrigger value="completed" data-value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dashboardCompleted')}</span>
              <span className="sm:hidden">Done</span>
            </TabsTrigger>
          </TabsList>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="space-y-4">
            {userTagIds.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Sparkles className="w-12 h-12 text-icon mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboardConfigureProfile')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('dashboardConfigureProfileMessage')}
                </p>
                <Button onClick={() => navigate('/profile/edit')}>
                  {t('dashboardEditProfile')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : recommendedTasks.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboardNoRecommendations')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboardNoMatchingTasks')}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedTasks.map(task => {
                  const counts = getCountsForTask(task.id);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onCollaborate={() => handleCollaborate(task)}
                      onRequest={() => handleRequest(task)}
                      collaboratorCount={counts.collaborators}
                      requesterCount={counts.requesters}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Activity Feed */}
          <TabsContent value="feed" className="space-y-4">
            <ActivityFeed 
              followingIds={followingIds} 
              onTaskClick={(taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (task) setSelectedTask(task);
              }}
            />
          </TabsContent>

          {/* Following */}
          <TabsContent value="following" className="space-y-4">
            {followingIds.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('noFollowing')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboardConfigureProfileMessage')}
                </p>
              </div>
            ) : followingTasks.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboardNoRecommendations')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboardNoMatchingTasks')}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followingTasks.map(task => {
                  const counts = getCountsForTask(task.id);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onCollaborate={() => handleCollaborate(task)}
                      onRequest={() => handleRequest(task)}
                      collaboratorCount={counts.collaborators}
                      requesterCount={counts.requesters}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* My Tasks */}
          <TabsContent value="mytasks" className="space-y-4">
            {myTasks.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <ListTodo className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboardNoTasksCreated')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('dashboardCreateFirstTask')}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboardCreateTask')}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed */}
          <TabsContent value="completed" className="space-y-4">
            {completedTasks.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-icon mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboardNoCompletedTasks')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboardCompletedTasksAppear')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2">{t('dashboardPersonalReport')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('dashboardCompletedCount')} {completedTasks.length} {t('dashboardKeepGoing')}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      showActions={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={handleCompleteTask}
        onRefresh={refreshTasks}
        onEdit={(task) => {
          setSelectedTask(null);
          handleEditTask(task);
        }}
        onDelete={async (taskId) => {
          const success = await deleteTask(taskId);
          if (success) {
            setSelectedTask(null);
          }
          return success;
        }}
      />

      <CreateTaskModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateTask}
        editTask={editingTask}
      />

      <TagsManager
        open={showTagsModal}
        onClose={() => setShowTagsModal(false)}
      />

      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        recommendedCount={recommendedTasks.length}
        myTasksCount={myTasks.length}
        completedCount={completedTasks.length}
      />
    </div>
  );
};

export default Dashboard;
