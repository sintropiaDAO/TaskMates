import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { PollDetailModal } from '@/components/polls/PollDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';
import { useProducts } from '@/hooks/useProducts';
import { usePolls } from '@/hooks/usePolls';
import { Task, Product, Poll } from '@/types';

interface ItemDetailModalHostProps {
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  selectedPoll: Poll | null;
  setSelectedPoll: (poll: Poll | null) => void;
  onRefresh?: () => void | Promise<void>;
  onCreateSubtask?: (parentTask: Task) => void;
  onOpenRelatedTask?: (task: Task) => void;
  onCreatePoll?: (taskId: string) => void;
  onCreateProduct?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onEditProduct?: (product: Product) => void;
  onEditPoll?: (poll: Poll) => void;
}

export function ItemDetailModalHost({
  selectedTask,
  setSelectedTask,
  selectedProduct,
  setSelectedProduct,
  selectedPoll,
  setSelectedPoll,
  onRefresh,
  onCreateSubtask,
  onOpenRelatedTask,
  onCreatePoll,
  onCreateProduct,
  onEditTask,
  onEditProduct,
  onEditPoll,
}: ItemDetailModalHostProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { completeTask, deleteTask, refreshTasks } = useTasks();
  const { deleteProduct, addParticipant: addProductParticipant, refreshProducts } = useProducts();
  const {
    vote: votePollRaw,
    addOption: addPollOption,
    deleteOption: deletePollOption,
    deletePoll,
    removeVote: removePollVote,
    fetchPollHistory,
    reopenPoll,
  } = usePolls();

  const refreshAll = async () => {
    await Promise.all([refreshTasks(), refreshProducts(), onRefresh?.()]);
  };

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

  return (
    <>
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={async (taskId, proofUrl, proofType) => completeTask(taskId, proofUrl, proofType)}
        onRefresh={refreshAll}
        onEdit={onEditTask ? (task) => { setSelectedTask(null); onEditTask(task); } : undefined}
        onDelete={async (taskId) => {
          const success = await deleteTask(taskId);
          if (success) {
            setSelectedTask(null);
            await refreshAll();
          }
          return success;
        }}
        onCreateSubtask={onCreateSubtask}
        onOpenRelatedTask={onOpenRelatedTask || ((task) => setSelectedTask(task))}
        onOpenProduct={(product) => {
          setSelectedTask(null);
          setSelectedProduct(product);
        }}
        onCreatePoll={onCreatePoll}
        onCreateProduct={onCreateProduct}
      />

      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onRefresh={refreshAll}
        onDelete={async (productId) => {
          const success = await deleteProduct(productId);
          if (success) {
            setSelectedProduct(null);
            await refreshAll();
          }
          return success;
        }}
        onParticipate={async (productId, role, qty) => {
          const result = await addProductParticipant(productId, role, qty);
          if (result) {
            toast({ title: language === 'pt' ? 'Participação registrada!' : 'Participation registered!' });
            await refreshAll();
          }
          return result;
        }}
        onEdit={onEditProduct ? (product) => { setSelectedProduct(null); onEditProduct(product); } : undefined}
      />

      <PollDetailModal
        poll={selectedPoll}
        open={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
        onVote={votePoll}
        onAddOption={addPollOption}
        onDeleteOption={deletePollOption}
        onEdit={onEditPoll ? (poll) => { setSelectedPoll(null); onEditPoll(poll); } : undefined}
        onDelete={async (pollId) => {
          await deletePoll(pollId);
          setSelectedPoll(null);
          await refreshAll();
        }}
        onRemoveVote={removePollVote}
        onFetchHistory={fetchPollHistory}
        onReopenPoll={reopenPoll}
        onRefresh={refreshAll}
      />
    </>
  );
}