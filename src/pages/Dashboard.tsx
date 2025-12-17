import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Plus, Tag, CheckCircle, ListTodo, Edit, 
  TrendingUp, Calendar, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { TagsManager } from '@/components/tags/TagsManager';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useTags } from '@/hooks/useTags';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { 
    tasks, 
    loading: tasksLoading, 
    createTask, 
    updateTask,
    completeTask, 
    getRecommendedTasks, 
    getUserTasks,
    getCompletedUserTasks,
    refreshTasks 
  } = useTasks();
  const { userTags } = useTags();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  const userTagIds = userTags.map(ut => ut.tag_id);
  const recommendedTasks = getRecommendedTasks(userTagIds);
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
        toast({ title: 'Tarefa atualizada!' });
        setEditingTask(null);
        return editingTask;
      }
      return null;
    }
    
    const task = await createTask(title, description, taskType, tagIds, deadline);
    if (task) {
      toast({ title: 'Tarefa criada com sucesso!' });
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
            Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Encontre tarefas que combinam com suas habilidades e interesses.
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
            <Plus className="w-6 h-6 text-primary" />
            <span>Criar Tarefa</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setShowTagsModal(true)}
          >
            <Tag className="w-6 h-6 text-secondary" />
            <span>Criar Tags</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/profile/edit')}
          >
            <Edit className="w-6 h-6 text-accent" />
            <span>Editar Perfil</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => {
              const tabsList = document.querySelector('[data-value="completed"]');
              tabsList?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <CheckCircle className="w-6 h-6 text-primary" />
            <span>Relatório</span>
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="glass rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{recommendedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Recomendadas</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <ListTodo className="w-6 h-6 text-secondary mx-auto mb-2" />
            <p className="text-2xl font-bold">{myTasks.length}</p>
            <p className="text-xs text-muted-foreground">Minhas Tarefas</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <CheckCircle className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="recommendations" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Recomendações</span>
              <span className="sm:hidden">Rec.</span>
            </TabsTrigger>
            <TabsTrigger value="mytasks" className="gap-2">
              <ListTodo className="w-4 h-4" />
              <span className="hidden sm:inline">Minhas Tarefas</span>
              <span className="sm:hidden">Minhas</span>
            </TabsTrigger>
            <TabsTrigger value="completed" data-value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Concluídas</span>
              <span className="sm:hidden">Conc.</span>
            </TabsTrigger>
          </TabsList>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="space-y-4">
            {userTagIds.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configure seu perfil</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione habilidades e comunidades ao seu perfil para receber recomendações personalizadas.
                </p>
                <Button onClick={() => navigate('/profile/edit')}>
                  Editar Perfil
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : recommendedTasks.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma recomendação</h3>
                <p className="text-muted-foreground">
                  Não encontramos tarefas que combinem com suas tags no momento.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Tasks */}
          <TabsContent value="mytasks" className="space-y-4">
            {myTasks.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <ListTodo className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa criada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira tarefa para começar a colaborar.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Tarefa
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
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa concluída</h3>
                <p className="text-muted-foreground">
                  Suas tarefas concluídas aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-semibold mb-2">Relatório Pessoal</h3>
                  <p className="text-muted-foreground text-sm">
                    Você completou {completedTasks.length} tarefa(s). Continue assim!
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
    </div>
  );
};

export default Dashboard;
