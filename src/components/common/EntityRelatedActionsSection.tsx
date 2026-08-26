import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Package, BarChart3, Loader2, ListTodo, Plus, Link as LinkIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateSeparatedList } from '@/components/common/DateSeparatedList';
import { SectionEmptyState } from '@/components/common/SectionEmptyState';
import { CreateTaskModalHost } from '@/components/common/CreateTaskModalHost';
import { CreateProductModal } from '@/components/products/CreateProductModal';
import { CreatePollModal } from '@/components/polls/CreatePollModal';
import { useProducts } from '@/hooks/useProducts';
import { usePolls } from '@/hooks/usePolls';
import { PRODUCT_SAFE_COLUMNS } from '@/lib/productFields';
import { Product, Poll } from '@/types';

type TabType = 'tasks' | 'products' | 'polls';

interface EntityRelatedActionsSectionProps {
  /** The entity owning this section */
  entityType: 'product' | 'poll';
  entityId: string;
  /** Task ids already known (polls have a single task_id) */
  taskId?: string | null;
  /** Enables the create/link buttons (owner and item not closed) */
  canManage?: boolean;
  onOpenTask?: (taskId: string) => void;
  onOpenProduct?: (product: Product) => void;
  onOpenPoll?: (poll: Poll) => void;
  onCountChange?: (count: number) => void;
  /** Called after a link/creation so the parent modal can refresh */
  onChanged?: () => void;
}

export function EntityRelatedActionsSection({
  entityType,
  entityId,
  taskId,
  canManage,
  onOpenTask,
  onOpenProduct,
  onOpenPoll,
  onCountChange,
  onChanged,
}: EntityRelatedActionsSectionProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createProduct } = useProducts();
  const { createPoll } = usePolls();

  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Action modals
  const [showLinkTask, setShowLinkTask] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [searchTask, setSearchTask] = useState('');
  const [linking, setLinking] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // 1. Resolve linked task ids
      let taskIds: string[] = [];
      if (entityType === 'poll') {
        if (taskId) taskIds = [taskId];
        // A poll's task can change after linking, so re-read it
        const { data: pollRow } = await supabase.from('polls').select('task_id').eq('id', entityId).maybeSingle();
        if (pollRow?.task_id) taskIds = [pollRow.task_id];
      } else {
        const { data: links } = await supabase
          .from('task_products')
          .select('task_id')
          .eq('product_id', entityId);
        taskIds = [...new Set((links || []).map(l => l.task_id))];
      }

      if (taskIds.length === 0) {
        if (!cancelled) {
          setTasks([]); setProducts([]); setPolls([]); setLinkedTaskIds([]); setLoading(false);
        }
        return;
      }

      const [tasksRes, productLinksRes, pollsRes] = await Promise.all([
        supabase.from('tasks').select('*').in('id', taskIds).order('created_at', { ascending: false }),
        supabase.from('task_products').select('product_id').in('task_id', taskIds),
        supabase.from('polls').select('*').in('task_id', taskIds).order('created_at', { ascending: false }),
      ]);

      // Sibling products (exclude self)
      const productIds = [...new Set((productLinksRes.data || []).map(l => l.product_id))]
        .filter(id => !(entityType === 'product' && id === entityId));
      let siblingProducts: Product[] = [];
      if (productIds.length > 0) {
        const { data } = await supabase.from('products').select(PRODUCT_SAFE_COLUMNS).in('id', productIds);
        siblingProducts = (data || []) as unknown as Product[];
      }

      const siblingPolls = ((pollsRes.data || []) as unknown as Poll[])
        .filter(p => !(entityType === 'poll' && p.id === entityId));

      if (cancelled) return;
      setLinkedTaskIds(taskIds);
      setTasks(tasksRes.data || []);
      setProducts(siblingProducts);
      setPolls(siblingPolls);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [entityType, entityId, taskId, reloadKey]);

  const total = tasks.length + products.length + polls.length;

  useEffect(() => { onCountChange?.(total); }, [total]);

  const primaryTaskId = linkedTaskIds[0];

  const afterChange = () => {
    reload();
    onChanged?.();
  };

  const linkTask = async (id: string) => {
    setLinking(true);
    let error: any = null;
    if (entityType === 'product') {
      const res = await supabase.from('task_products').insert({ task_id: id, product_id: entityId });
      error = res.error;
    } else {
      const res = await supabase.from('polls').update({ task_id: id }).eq('id', entityId);
      error = res.error;
    }
    setLinking(false);
    if (error) {
      toast({
        title: language === 'pt' ? 'Não foi possível vincular' : 'Could not link',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: language === 'pt' ? 'Tarefa vinculada!' : 'Task linked!' });
    setShowLinkTask(false);
    afterChange();
  };

  const unlinkTask = async (id: string) => {
    if (entityType === 'product') {
      await supabase.from('task_products').delete().eq('task_id', id).eq('product_id', entityId);
    } else {
      await supabase.from('polls').update({ task_id: null }).eq('id', entityId);
    }
    toast({ title: language === 'pt' ? 'Tarefa desvinculada' : 'Task unlinked' });
    afterChange();
  };

  const openLinkTaskModal = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('created_by', user?.id || '')
      .order('created_at', { ascending: false })
      .limit(100);
    setAvailableTasks((data || []).filter(t => !linkedTaskIds.includes(t.id)));
    setSearchTask('');
    setShowLinkTask(true);
  };

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', count: tasks.length, icon: <GitBranch className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', count: products.length, icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Opiniões' : 'Opinions', count: polls.length, icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const needsTaskHint = (
    <p className="text-[11px] text-muted-foreground text-center">
      {language === 'pt'
        ? 'Vincule uma tarefa primeiro para relacionar novos itens.'
        : 'Link a task first to relate new items.'}
    </p>
  );

  const canLinkTask = canManage && !(entityType === 'poll' && linkedTaskIds.length > 0);

  return (
    <div className="space-y-3">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {activeTab === 'tasks' && (
            <>
              {tasks.length === 0 ? (
                <SectionEmptyState message={language === 'pt' ? 'Nenhuma tarefa vinculada ainda.' : 'No linked tasks yet.'} />
              ) : (
                <DateSeparatedList
                  items={tasks}
                  language={language}
                  getDate={t => t.created_at}
                  getKey={t => t.id}
                  renderItem={t => (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => onOpenTask?.(t.id)}
                      >
                        <ListTodo className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {t.status === 'completed'
                              ? (language === 'pt' ? 'Concluída' : 'Completed')
                              : t.status === 'in_progress'
                                ? (language === 'pt' ? 'Em andamento' : 'In progress')
                                : (language === 'pt' ? 'Aberta' : 'Open')}
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <button
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => { e.stopPropagation(); unlinkTask(t.id); }}
                          aria-label={language === 'pt' ? 'Desvincular tarefa' : 'Unlink task'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                />
              )}

              {canLinkTask && (
                <div className="flex flex-col gap-2 pt-1">
                  <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={openLinkTaskModal}>
                    <LinkIcon className="w-3.5 h-3.5" />
                    {language === 'pt' ? 'Vincular Tarefa' : 'Link Task'}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setShowCreateTask(true)}>
                    <Plus className="w-3.5 h-3.5" /><GitBranch className="w-3.5 h-3.5" />
                    {language === 'pt' ? 'Criar Tarefa' : 'Create Task'}
                  </Button>
                </div>
              )}
            </>
          )}

          {activeTab === 'products' && (
            <>
              {products.length === 0 ? (
                <SectionEmptyState message={language === 'pt' ? 'Nenhum produto relacionado.' : 'No related products.'} />
              ) : (
                <DateSeparatedList
                  items={products}
                  language={language}
                  getDate={p => p.created_at}
                  getKey={p => p.id}
                  renderItem={p => (
                    <div
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => onOpenProduct?.(p)}
                    >
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {p.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')}
                        </span>
                      </div>
                    </div>
                  )}
                />
              )}

              {canManage && (
                primaryTaskId ? (
                  <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setShowCreateProduct(true)}>
                    <Plus className="w-3.5 h-3.5" /><Package className="w-3.5 h-3.5" />
                    {language === 'pt' ? 'Criar Produto' : 'Create Product'}
                  </Button>
                ) : needsTaskHint
              )}
            </>
          )}

          {activeTab === 'polls' && (
            <>
              {polls.length === 0 ? (
                <SectionEmptyState message={language === 'pt' ? 'Nenhuma opinião relacionada.' : 'No related opinions.'} />
              ) : (
                <DateSeparatedList
                  items={polls}
                  language={language}
                  getDate={p => p.created_at}
                  getKey={p => p.id}
                  renderItem={p => (
                    <div
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => onOpenPoll?.(p)}
                    >
                      <BarChart3 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {p.status === 'active' ? (language === 'pt' ? 'Ativa' : 'Active') : (language === 'pt' ? 'Encerrada' : 'Closed')}
                        </span>
                      </div>
                    </div>
                  )}
                />
              )}

              {canManage && (
                primaryTaskId ? (
                  <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setShowCreatePoll(true)}>
                    <Plus className="w-3.5 h-3.5" /><BarChart3 className="w-3.5 h-3.5" />
                    {language === 'pt' ? 'Criar Opinião' : 'Create Opinion'}
                  </Button>
                ) : needsTaskHint
              )}
            </>
          )}
        </div>
      )}

      {/* Link existing task */}
      <Dialog open={showLinkTask} onOpenChange={setShowLinkTask}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              {language === 'pt' ? 'Vincular Tarefa' : 'Link Task'}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={searchTask}
            onChange={e => setSearchTask(e.target.value)}
            placeholder={language === 'pt' ? 'Buscar nas minhas tarefas...' : 'Search my tasks...'}
          />
          <div className="space-y-2">
            {availableTasks
              .filter(t => t.title.toLowerCase().includes(searchTask.toLowerCase()))
              .slice(0, 20)
              .map(t => (
                <button
                  key={t.id}
                  disabled={linking}
                  onClick={() => linkTask(t.id)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  <ListTodo className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{t.title}</span>
                </button>
              ))}
            {availableTasks.length === 0 && (
              <SectionEmptyState message={language === 'pt' ? 'Você ainda não criou tarefas.' : 'You have not created any tasks yet.'} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create + link a new task */}
      <CreateTaskModalHost
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onSaved={async (task) => {
          setShowCreateTask(false);
          await linkTask(task.id);
        }}
      />

      {/* Create product linked to the same task */}
      <CreateProductModal
        open={showCreateProduct}
        onClose={() => setShowCreateProduct(false)}
        onSubmit={createProduct}
        taskId={primaryTaskId}
      />

      {/* Create opinion linked to the same task */}
      <CreatePollModal
        open={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
        onSubmit={createPoll}
        taskId={primaryTaskId}
      />
    </div>
  );
}
