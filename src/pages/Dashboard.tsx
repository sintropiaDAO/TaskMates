import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Calendar, ChevronRight, MapPin, AlertTriangle, Filter,
  ClipboardList, Package, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { CreateProductModal } from '@/components/products/CreateProductModal';
import { PollCard } from '@/components/polls/PollCard';
import { PollDetailModal } from '@/components/polls/PollDetailModal';
import { CreatePollModal } from '@/components/polls/CreatePollModal';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { PendingRatingsSection } from '@/components/dashboard/PendingRatingsSection';
import { QuizBanner } from '@/components/dashboard/QuizBanner';
import { NearbyMap } from '@/components/dashboard/NearbyMap';
import { MyTasksSection } from '@/components/dashboard/MyTasksSection';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { useTagCorrelations } from '@/hooks/useTagCorrelations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTasks } from '@/hooks/useTasks';
import { useTags } from '@/hooks/useTags';
import { useTaskCollaborators } from '@/hooks/useTaskCollaborators';
import { useFollows } from '@/hooks/useFollows';
import { useProducts } from '@/hooks/useProducts';
import { usePolls } from '@/hooks/usePolls';
import { useSectionVisits } from '@/hooks/useSectionVisits';
import { Task, Product, Poll } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Section = 'mytasks' | 'feed' | 'recommendations' | 'nearby';
type ContentFilter = 'all' | 'tasks' | 'products' | 'polls';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const { 
    tasks, loading: tasksLoading, createTask, updateTask, completeTask, deleteTask,
    getRecommendedTasksWithReasons, getFollowingTasks, getNearbyTasks, refreshTasks 
  } = useTasks();
  const { userTags, tags: allTags, getTranslatedName } = useTags();
  const { 
    fetchCollaboratorCounts, addCollaborator, getCountsForTask,
    getUserInterestForTask, cancelInterest
  } = useTaskCollaborators();
  const { followingIds } = useFollows();
  const { getCorrelatedTags } = useTagCorrelations();
  const { products, createProduct, updateProduct, addParticipant: addProductParticipant, deleteProduct, refreshProducts, voteProduct, getUserProductVote } = useProducts();
  const { polls, createPoll, updatePoll, vote: votePollRaw, addOption: addPollOption, deleteOption: deletePollOption, deletePoll, removeVote, fetchPollHistory, votePoll: votePollLike, getUserPollVote } = usePolls();
  const [editingPoll, setEditingPoll] = useState<typeof polls[0] | null>(null);
  const votePoll = async (pollId: string, optionId: string) => {
    const result = await votePollRaw(pollId, optionId);
    if (!result) {
      toast({
        title: t('error'),
        description: t('unverifiedCannotVote'),
        variant: 'destructive',
      });
    }
    return result;
  };
  const { toast } = useToast();
  const { markVisited, isNewSince, hasNewItems } = useSectionVisits();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeSection, setActiveSection] = useState<Section>('recommendations');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [subtaskParentId, setSubtaskParentId] = useState<string | undefined>(undefined);
  const [subtaskPreSelectedTags, setSubtaskPreSelectedTags] = useState<string[] | undefined>(undefined);
  const [pollTaskId, setPollTaskId] = useState<string | undefined>(undefined);
  const [productTaskId, setProductTaskId] = useState<string | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [myTasksInitialTab, setMyTasksInitialTab] = useState<'tasks' | 'products' | 'polls' | 'tags' | undefined>(undefined);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tasks.length > 0) {
      fetchCollaboratorCounts(tasks.map(t => t.id));
    }
  }, [tasks, fetchCollaboratorCounts]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, tasks, setSearchParams]);

  // Mark section as visited when switching tabs
  useEffect(() => {
    markVisited(activeSection);
    // Also mark sub-tabs when entering mytasks
    if (activeSection === 'mytasks') {
      markVisited('my_tasks_tab');
      markVisited('my_products_tab');
      markVisited('my_polls_tab');
      markVisited('my_tags_tab');
    }
  }, [activeSection, markVisited]);

  // Fetch nearby communities with location
  const [nearbyCommunities, setNearbyCommunities] = useState<{ id: string; name: string; location: string }[]>([]);
  useEffect(() => {
    if (!profile?.location) return;
    const fetchNearbyCommunities = async () => {
      const { data } = await supabase
        .from('community_settings')
        .select('tag_id, location, tags:tag_id(id, name)')
        .not('location', 'is', null);
      if (data) {
        const userCity = profile.location!.split(',')[0].trim().toLowerCase();
        const nearby = data
          .filter((cs: any) => cs.location?.toLowerCase().includes(userCity) && cs.tags)
          .map((cs: any) => ({ id: cs.tags.id, name: cs.tags.name, location: cs.location }));
        setNearbyCommunities(nearby);
      }
    };
    fetchNearbyCommunities();
  }, [profile?.location]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  const userTagIds = userTags.map(ut => ut.tag_id);
  const correlatedTagIds: string[] = [];
  userTagIds.forEach(tagId => {
    const correlated = getCorrelatedTags(tagId, 5);
    correlated.forEach(({ tagId: corrId }) => {
      if (!userTagIds.includes(corrId) && !correlatedTagIds.includes(corrId)) correlatedTagIds.push(corrId);
    });
  });
  
  const recommendedWithReasons = getRecommendedTasksWithReasons(userTagIds, correlatedTagIds, followingIds);
  const nearbyTasks = getNearbyTasks(profile?.location || null);

  // Filter products and polls for recommendations (matching user tags)
  const recommendedProducts = products.filter(p => {
    if (p.status === 'delivered' || p.created_by === user?.id) return false;
    const pTagIds = p.tags?.map(t => t.id) || [];
    return pTagIds.some(id => userTagIds.includes(id) || correlatedTagIds.includes(id));
  });

  const recommendedPolls = polls.filter(p => {
    if (p.status === 'closed' || p.created_by === user?.id) return false;
    const pTagIds = p.tags?.map(t => t.id) || [];
    return pTagIds.some(id => userTagIds.includes(id) || correlatedTagIds.includes(id));
  });

  const nearbyProducts = products.filter(p => {
    if (!profile?.location || p.status === 'delivered') return false;
    const userCity = profile.location.split(',')[0].trim().toLowerCase();
    return p.location?.toLowerCase().includes(userCity);
  });



  const handleCreateTask = async (
    title: string, description: string, taskType: 'offer' | 'request' | 'personal',
    tagIds: string[], deadline?: string, imageUrl?: string,
    priority?: 'low' | 'medium' | 'high' | null, location?: string, parentTaskId?: string
  ) => {
    if (editingTask) {
      const success = await updateTask(editingTask.id, { 
        title, description, task_type: taskType, deadline: deadline || null,
        image_url: imageUrl || null, priority: priority || null, location: location || null
      }, tagIds);
      if (success) {
        toast({ title: t('dashboardTaskUpdated') });
        setEditingTask(null);
        return editingTask;
      }
      return null;
    }
    const task = await createTask(title, description, taskType, tagIds, deadline, imageUrl, priority, location, parentTaskId);
    if (task) toast({ title: t('dashboardTaskCreated') });
    return task;
  };

  const handleCompleteTask = async (taskId: string, proofUrl: string, proofType: string) => {
    return await completeTask(taskId, proofUrl, proofType);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowCreateModal(true);
  };

  const handleCollaborate = async (task: Task) => {
    const result = await addCollaborator(task.id, 'collaborate', task.created_by, task.title);
    if (result.success) {
      toast({ title: t('taskCollaborationSent') });
      fetchCollaboratorCounts(tasks.map(t => t.id));
    } else if (result.error === 'already_exists_same_status') {
      toast({ title: t('taskAlreadyCollaborated') });
    }
  };

  const handleRequest = async (task: Task) => {
    const result = await addCollaborator(task.id, 'request', task.created_by, task.title);
    if (result.success) {
      toast({ title: t('taskRequestSent') });
      fetchCollaboratorCounts(tasks.map(t => t.id));
    } else if (result.error === 'already_exists_same_status') {
      toast({ title: t('taskAlreadyRequested') });
    }
  };

  const handleCancelCollaborate = async (task: Task) => {
    const result = await cancelInterest(task.id, 'collaborate');
    if (result.success) toast({ title: t('taskCollaborationCanceled') });
  };

  const handleCancelRequest = async (task: Task) => {
    const result = await cancelInterest(task.id, 'request');
    if (result.success) toast({ title: t('taskRequestCanceled') });
  };

  // Filter tabs component
  const getFilterIcon = (filter: ContentFilter) => {
    switch (filter) {
      case 'all':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'tasks':
        return <ClipboardList className="w-3.5 h-3.5" />;
      case 'products':
        return <Package className="w-3.5 h-3.5" />;
      case 'polls':
        return <BarChart3 className="w-3.5 h-3.5" />;
    }
  };

  const FilterTabs = () => (
    <div className="grid grid-cols-4 gap-1 mb-4">
      {(['all', 'tasks', 'products', 'polls'] as ContentFilter[]).map(filter => (
        <button
          key={filter}
          onClick={() => setContentFilter(filter)}
          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
            contentFilter === filter
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {getFilterIcon(filter)}
          <span className="truncate">{filter === 'all' ? (language === 'pt' ? 'Todos' : 'All') :
           filter === 'tasks' ? (language === 'pt' ? 'Tarefas' : 'Tasks') :
           filter === 'products' ? (language === 'pt' ? 'Produtos' : 'Products') :
           (language === 'pt' ? 'Enquetes' : 'Polls')}</span>
        </button>
      ))}
    </div>
  );

  const renderTaskCard = (task: Task, reasons?: string[], sectionKey?: string) => {
    const counts = getCountsForTask(task.id);
    const interest = getUserInterestForTask(task.id);
    return (
      <TaskCard
        key={task.id}
        task={task}
        onClick={() => { if (sectionKey) markVisited(sectionKey); setSelectedTask(task); }}
        onCollaborate={() => handleCollaborate(task)}
        onRequest={() => handleRequest(task)}
        onCancelCollaborate={() => handleCancelCollaborate(task)}
        onCancelRequest={() => handleCancelRequest(task)}
        collaboratorCount={counts.collaborators}
        requesterCount={counts.requesters}
        hasCollaborated={interest.hasCollaborated}
        hasRequested={interest.hasRequested}
        recommendationReasons={reasons}
        isNew={sectionKey ? isNewSince(sectionKey, task.created_at) : false}
      />
    );
  };

  const renderMixedGrid = (
    taskList: { task: Task; reasons?: string[] }[],
    productList: typeof products,
    pollList: typeof polls,
    sectionKey?: string
  ) => {
    const showTasks = contentFilter === 'all' || contentFilter === 'tasks';
    const showProducts = contentFilter === 'all' || contentFilter === 'products';
    const showPolls = contentFilter === 'all' || contentFilter === 'polls';

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showTasks && taskList.map(({ task, reasons }) => renderTaskCard(task, reasons, sectionKey))}
        {showProducts && productList.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => { if (sectionKey) markVisited(sectionKey); setSelectedProduct(product); }}
            onParticipate={async (productId, role, qty) => {
              const result = await addProductParticipant(productId, role, qty);
              if (result) toast({ title: language === 'pt' ? 'Participação registrada!' : 'Participation registered!' });
            }}
            isNew={sectionKey ? isNewSince(sectionKey, product.created_at) : false}
          />
        ))}
        {showPolls && pollList.map(poll => (
          <PollCard
            key={poll.id}
            poll={poll}
            onVote={votePoll}
            onAddOption={addPollOption}
            isNew={sectionKey ? isNewSince(sectionKey, poll.created_at) : false}
            onClick={() => { if (sectionKey) markVisited(sectionKey); setSelectedPoll(poll); }}
          />
        ))}
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'mytasks':
        return (
          <MyTasksSection 
            tasks={tasks}
            onTaskClick={(task) => { markVisited('mytasks'); setSelectedTask(task); }}
            products={products}
            onProductClick={(product) => { markVisited('mytasks'); setSelectedProduct(product); }}
            polls={polls}
            onVotePoll={votePoll}
            onAddPollOption={addPollOption}
            onEditPoll={(poll) => setEditingPoll(poll)}
            onDeletePoll={deletePoll}
            onRemoveVote={removeVote}
            onFetchPollHistory={fetchPollHistory}
            onPollClick={(poll) => { markVisited('mytasks'); setSelectedPoll(poll); }}
            isNewItem={isNewSince}
            markVisited={markVisited}
            userTags={userTags}
            getTranslatedName={getTranslatedName}
            initialTab={myTasksInitialTab}
          />
        );

      case 'recommendations':
        return userTagIds.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Sparkles className="w-12 h-12 text-icon mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('dashboardConfigureProfile')}</h3>
            <p className="text-muted-foreground mb-4">{t('dashboardConfigureProfileMessage')}</p>
            <Button onClick={() => { setMyTasksInitialTab('tags'); setActiveSection('mytasks'); }}>
              {language === 'pt' ? 'Adicionar tags' : 'Add tags'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <>
            <FilterTabs />
            {(() => {
              const showTasks = contentFilter === 'all' || contentFilter === 'tasks';
              const showProducts = contentFilter === 'all' || contentFilter === 'products';
              const showPolls = contentFilter === 'all' || contentFilter === 'polls';
              const hasTaskItems = showTasks && recommendedWithReasons.length > 0;
              const hasProductItems = showProducts && recommendedProducts.length > 0;
              const hasPollItems = showPolls && recommendedPolls.length > 0;
              const hasAnyVisible = hasTaskItems || hasProductItems || hasPollItems;

              if (!hasAnyVisible) {
                const emptyLabel = contentFilter === 'tasks' 
                  ? (language === 'pt' ? 'tarefas recomendadas' : 'recommended tasks')
                  : contentFilter === 'products'
                  ? (language === 'pt' ? 'produtos recomendados' : 'recommended products')
                  : contentFilter === 'polls'
                  ? (language === 'pt' ? 'enquetes recomendadas' : 'recommended polls')
                  : (language === 'pt' ? 'recomendações' : 'recommendations');

                return (
                  <div className="glass rounded-xl p-8 text-center">
                    <Calendar className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {language === 'pt' ? `Nenhuma ${emptyLabel} no momento` : `No ${emptyLabel} right now`}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {language === 'pt' 
                        ? 'Adicione mais tags ao seu perfil para melhorar suas recomendações personalizadas.' 
                        : 'Add more tags to your profile to improve your personalized recommendations.'}
                    </p>
                    <Button onClick={() => { setMyTasksInitialTab('tags'); setActiveSection('mytasks'); }} variant="outline" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      {language === 'pt' ? 'Adicionar tags ao perfil' : 'Add tags to profile'}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                );
              }

              return renderMixedGrid(recommendedWithReasons, recommendedProducts, recommendedPolls, 'recommendations');
            })()}
          </>
        );

      case 'feed':
        return (
          <ActivityFeed 
            followingIds={followingIds}
            currentUserId={user?.id}
            onTaskClick={(taskId) => {
              const task = tasks.find(t => t.id === taskId);
              if (task) setSelectedTask(task);
            }}
          />
        );

      case 'nearby':
        return !profile?.location ? (
          <div className="glass rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('dashboardLocationNotSet')}</h3>
            <Alert className="mb-4 max-w-md mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{t('addLocationWarning')}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/profile/edit')}>
              {t('dashboardEditProfile')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-icon" />
                {t('nearbyMapTitle')}
              </h3>
              <NearbyMap 
                tasks={nearbyTasks}
                products={nearbyProducts}
                communities={nearbyCommunities}
                userLocation={profile.location}
                userId={user?.id}
                onTaskClick={(task) => setSelectedTask(task)}
                onProductClick={(product) => setSelectedProduct(product)}
                onCommunityClick={(id) => navigate(`/tags/${id}`)}
              />
            </div>
            <FilterTabs />
            {nearbyTasks.length === 0 && nearbyProducts.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <MapPin className="w-12 h-12 text-icon-secondary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('noNearbyTasks')}</h3>
                <p className="text-muted-foreground">{t('nearYouDescription')}</p>
              </div>
            ) : (
              renderMixedGrid(
                nearbyTasks.map(task => ({ task })),
                nearbyProducts,
                [],
                'nearby'
              )
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-20">
      <main className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-display font-bold mb-1">
            {t('dashboardHello')}, {profile?.full_name?.split(' ')[0] || t('user')}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('dashboardWelcomeMessage')}
          </p>
        </motion.div>

        <QuizBanner userTagsCount={userTags.length} />
        <PendingRatingsSection onTaskClick={(task) => setSelectedTask(task)} />

        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {renderSection()}
        </motion.div>
      </main>

      <BottomNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onCreateTask={() => {
          setEditingTask(null);
          setSubtaskParentId(undefined);
          setSubtaskPreSelectedTags(undefined);
          setShowCreateModal(true);
        }}
        onCreateProduct={() => setShowProductModal(true)}
        onCreatePoll={() => setShowPollModal(true)}
        newIndicators={{
          mytasks: hasNewItems('mytasks', [...tasks, ...products, ...polls]),
          feed: hasNewItems('feed', tasks),
          recommendations: hasNewItems('recommendations', [...tasks, ...products, ...polls]),
          nearby: hasNewItems('nearby', [...tasks, ...products]),
        }}
      />

      {/* Modals */}
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={handleCompleteTask}
        onRefresh={refreshTasks}
        onEdit={(task) => { setSelectedTask(null); handleEditTask(task); }}
        onDelete={async (taskId) => {
          const success = await deleteTask(taskId);
          if (success) setSelectedTask(null);
          return success;
        }}
        onCreateSubtask={(parentTask) => {
          setSelectedTask(null);
          setSubtaskParentId(parentTask.id);
          setSubtaskPreSelectedTags(parentTask.tags?.map(t => t.id) || []);
          setEditingTask(null);
          setShowCreateModal(true);
        }}
        onOpenRelatedTask={(task) => setSelectedTask(task)}
        onOpenProduct={(product) => { setSelectedTask(null); setSelectedProduct(product); }}
        onCreatePoll={(taskId) => { setPollTaskId(taskId); setShowPollModal(true); }}
        onCreateProduct={(taskId) => { setProductTaskId(taskId); setShowProductModal(true); }}
      />

      <CreateTaskModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
          setSubtaskParentId(undefined);
          setSubtaskPreSelectedTags(undefined);
        }}
        onSubmit={handleCreateTask}
        editTask={editingTask}
        onComplete={handleCompleteTask}
        parentTaskId={subtaskParentId}
        preSelectedTags={subtaskPreSelectedTags}
      />

      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onRefresh={refreshProducts}
        onDelete={async (productId) => {
          const success = await deleteProduct(productId);
          if (success) setSelectedProduct(null);
          return success;
        }}
        onParticipate={async (productId, role, qty) => {
          const result = await addProductParticipant(productId, role, qty);
          if (result) toast({ title: language === 'pt' ? 'Participação registrada!' : 'Participation registered!' });
        }}
        onEdit={(product) => {
          setEditingProduct(product);
          setShowProductModal(true);
        }}
      />

      <CreateProductModal
        open={showProductModal}
        onClose={() => { setShowProductModal(false); setProductTaskId(undefined); setEditingProduct(null); }}
        onSubmit={createProduct}
        taskId={productTaskId}
        editProduct={editingProduct}
        onUpdate={async (productId, updates, tagIds) => {
          const success = await updateProduct(productId, updates, tagIds);
          if (success) refreshProducts();
          return success;
        }}
      />

      <CreatePollModal
        open={showPollModal || !!editingPoll}
        onClose={() => { setShowPollModal(false); setPollTaskId(undefined); setEditingPoll(null); }}
        onSubmit={createPoll}
        onUpdate={updatePoll}
        onDeleteOption={deletePollOption}
        onAddOption={addPollOption}
        taskId={pollTaskId}
        editPoll={editingPoll}
      />

      <PollDetailModal
        poll={selectedPoll}
        open={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
        onVote={votePoll}
        onAddOption={addPollOption}
        onDeleteOption={deletePollOption}
        onEdit={(poll) => { setSelectedPoll(null); setEditingPoll(poll); }}
        onDelete={async (pollId) => { await deletePoll(pollId); setSelectedPoll(null); }}
        onRemoveVote={removeVote}
        onFetchHistory={fetchPollHistory}
        onRefresh={async () => { /* polls refresh automatically */ }}
      />
    </div>
  );
};

export default Dashboard;
