import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Plus, Tag, Edit, 
  Calendar, ChevronRight, Users, Activity, FileText, MapPin, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { TagsManager } from '@/components/tags/TagsManager';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { PendingRatingsSection } from '@/components/dashboard/PendingRatingsSection';
import { ReportModal } from '@/components/dashboard/ReportModal';
import { QuizBanner } from '@/components/dashboard/QuizBanner';
import { NearbyMap } from '@/components/dashboard/NearbyMap';
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
    getNearbyTasks,
    refreshTasks 
  } = useTasks();
  const { userTags } = useTags();
  const { 
    fetchCollaboratorCounts, 
    addCollaborator, 
    getCountsForTask,
    getUserInterestForTask,
    cancelInterest
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
  const nearbyTasks = getNearbyTasks(profile?.location || null);

  const handleCreateTask = async (
    title: string,
    description: string,
    taskType: 'offer' | 'request' | 'personal',
    tagIds: string[],
    deadline?: string,
    imageUrl?: string,
    priority?: 'low' | 'medium' | 'high' | null,
    location?: string
  ) => {
    if (editingTask) {
      const success = await updateTask(editingTask.id, { 
        title, 
        description, 
        task_type: taskType, 
        deadline: deadline || null,
        image_url: imageUrl || null,
        priority: priority || null,
        location: location || null
      }, tagIds);
      if (success) {
        toast({ title: t('dashboardTaskUpdated') });
        setEditingTask(null);
        return editingTask;
      }
      return null;
    }
    
    const task = await createTask(title, description, taskType, tagIds, deadline, imageUrl, priority, location);
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
      // Refresh counts
      const taskIds = tasks.map(t => t.id);
      fetchCollaboratorCounts(taskIds);
    } else if (result.error === 'already_exists_same_status') {
      toast({ title: t('taskAlreadyCollaborated') });
    }
  };

  const handleRequest = async (task: Task) => {
    const result = await addCollaborator(task.id, 'request', task.created_by, task.title);
    if (result.success) {
      toast({ title: t('taskRequestSent') });
      // Refresh counts
      const taskIds = tasks.map(t => t.id);
      fetchCollaboratorCounts(taskIds);
    } else if (result.error === 'already_exists_same_status') {
      toast({ title: t('taskAlreadyRequested') });
    }
  };

  const handleCancelCollaborate = async (task: Task) => {
    const result = await cancelInterest(task.id, 'collaborate');
    if (result.success) {
      toast({ title: t('taskCollaborationCanceled') });
    }
  };

  const handleCancelRequest = async (task: Task) => {
    const result = await cancelInterest(task.id, 'request');
    if (result.success) {
      toast({ title: t('taskRequestCanceled') });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
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

        {/* Quiz Banner */}
        <QuizBanner userTagsCount={userTags.length} />

        {/* Pending Ratings Section */}
        <PendingRatingsSection onTaskClick={(task) => setSelectedTask(task)} />

        {/* Tabs */}
        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
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
            <TabsTrigger value="nearby" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nearYou')}</span>
              <span className="sm:hidden">Perto</span>
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
                  const interest = getUserInterestForTask(task.id);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onCollaborate={() => handleCollaborate(task)}
                      onRequest={() => handleRequest(task)}
                      onCancelCollaborate={() => handleCancelCollaborate(task)}
                      onCancelRequest={() => handleCancelRequest(task)}
                      collaboratorCount={counts.collaborators}
                      requesterCount={counts.requesters}
                      hasCollaborated={interest.hasCollaborated}
                      hasRequested={interest.hasRequested}
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
              currentUserId={user?.id}
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
                  const interest = getUserInterestForTask(task.id);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onCollaborate={() => handleCollaborate(task)}
                      onRequest={() => handleRequest(task)}
                      onCancelCollaborate={() => handleCancelCollaborate(task)}
                      onCancelRequest={() => handleCancelRequest(task)}
                      collaboratorCount={counts.collaborators}
                      requesterCount={counts.requesters}
                      hasCollaborated={interest.hasCollaborated}
                      hasRequested={interest.hasRequested}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Near You - Now last */}
          <TabsContent value="nearby" className="space-y-4">
            {!profile?.location ? (
              <div className="glass rounded-xl p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboardLocationNotSet')}</h3>
                <Alert className="mb-4 max-w-md mx-auto">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('addLocationWarning')}
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate('/profile/edit')}>
                  {t('dashboardEditProfile')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Map Section */}
                <div className="glass rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-icon" />
                    {t('nearbyMapTitle')}
                  </h3>
                  <NearbyMap 
                    tasks={nearbyTasks} 
                    userLocation={profile.location}
                    onTaskClick={(task) => setSelectedTask(task)}
                  />
                </div>
                
                {/* Tasks List */}
                {nearbyTasks.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <MapPin className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('noNearbyTasks')}</h3>
                    <p className="text-muted-foreground">
                      {t('nearYouDescription')}
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbyTasks.map(task => {
                      const counts = getCountsForTask(task.id);
                      const interest = getUserInterestForTask(task.id);
                      return (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                          onCollaborate={() => handleCollaborate(task)}
                          onRequest={() => handleRequest(task)}
                          onCancelCollaborate={() => handleCancelCollaborate(task)}
                          onCancelRequest={() => handleCancelRequest(task)}
                          collaboratorCount={counts.collaborators}
                          requesterCount={counts.requesters}
                          hasCollaborated={interest.hasCollaborated}
                          hasRequested={interest.hasRequested}
                        />
                      );
                    })}
                  </div>
                )}
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
        onComplete={handleCompleteTask}
      />

      <TagsManager
        open={showTagsModal}
        onClose={() => setShowTagsModal(false)}
      />

      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        recommendedCount={recommendedTasks.length}
        myTasksCount={nearbyTasks.length}
        completedCount={0}
      />
    </div>
  );
};

export default Dashboard;
