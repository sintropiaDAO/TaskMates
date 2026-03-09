import { useState, useEffect } from 'react';
import { GitBranch, Package, BarChart3, Plus, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TaskCardMini } from '@/components/tasks/TaskCardMini';
import { UserAvatar } from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Task, Product, Poll, Tag, Profile } from '@/types';

type TabType = 'tasks' | 'products' | 'polls';

interface RelatedActionsSectionProps {
  task: Task;
  isOwner: boolean;
  isCompleted: boolean;
  isApprovedCollaborator: boolean;
  onTaskClick: (task: Task) => void;
  onOpenProduct?: (product: Product) => void;
  onCreatePoll?: (taskId: string) => void;
  onCreateProduct?: (taskId: string) => void;
  onCreateSubtask?: (task: Task) => void;
  /** When true, renders without outer card wrapper */
  embedded?: boolean;
}

export function RelatedActionsSection({
  task,
  isOwner,
  isCompleted,
  isApprovedCollaborator,
  onTaskClick,
  onOpenProduct,
  onCreatePoll,
  onCreateProduct,
  onCreateSubtask,
  embedded,
}: RelatedActionsSectionProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');

  // Tasks state
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [siblingTasks, setSiblingTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);

  // Products state
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const [showLinkProductModal, setShowLinkProductModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [linking, setLinking] = useState(false);

  // Polls state
  const [linkedPolls, setLinkedPolls] = useState<Poll[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const MAX_VISIBLE = 3;

  // Enrich tasks with tags and profiles
  const enrichTasks = async (tasksData: any[]): Promise<Task[]> => {
    if (tasksData.length === 0) return [];
    const taskIds = tasksData.map(t => t.id);
    const creatorIds = [...new Set(tasksData.map(t => t.created_by))];
    const [tagsResult, profilesResult] = await Promise.all([
      supabase.from('task_tags').select('task_id, tag:tags(*)').in('task_id', taskIds),
      supabase.from('public_profiles').select('*').in('id', creatorIds),
    ]);
    const tagsByTask: Record<string, Tag[]> = {};
    tagsResult.data?.forEach(tt => {
      if (!tagsByTask[tt.task_id]) tagsByTask[tt.task_id] = [];
      if (tt.tag) tagsByTask[tt.task_id].push(tt.tag as Tag);
    });
    const profilesMap: Record<string, Profile> = {};
    profilesResult.data?.forEach(p => { profilesMap[p.id!] = p as unknown as Profile; });
    return tasksData.map(t => ({ ...t, tags: tagsByTask[t.id] || [], creator: profilesMap[t.created_by] })) as Task[];
  };

  const fetchRelatedTasks = async () => {
    setTasksLoading(true);
    const { data: children } = await supabase.from('tasks').select('*').eq('parent_task_id', task.id).order('created_at', { ascending: false });
    let parent: Task | null = null;
    let siblings: Task[] = [];
    if (task.parent_task_id) {
      const { data: parentData } = await supabase.from('tasks').select('*').eq('id', task.parent_task_id).single();
      if (parentData) { const e = await enrichTasks([parentData]); parent = e[0] || null; }
      const { data: siblingsData } = await supabase.from('tasks').select('*').eq('parent_task_id', task.parent_task_id).neq('id', task.id).order('created_at', { ascending: false });
      if (siblingsData?.length) siblings = await enrichTasks(siblingsData);
    }
    setParentTask(parent);
    setChildTasks(children ? await enrichTasks(children) : []);
    setSiblingTasks(siblings);
    setTasksLoading(false);
  };

  const fetchLinkedProducts = async () => {
    const { data: links } = await supabase.from('task_products').select('product_id').eq('task_id', task.id);
    if (links && links.length > 0) {
      const productIds = links.map(l => l.product_id);
      const { data: products } = await supabase.from('products').select('*').in('id', productIds);
      if (products) {
        const creatorIds = [...new Set(products.map(p => p.created_by))];
        const { data: profiles } = await supabase.from('public_profiles').select('*').in('id', creatorIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setLinkedProducts(products.map(p => ({
          ...p, creator: profileMap.get(p.created_by) as Profile,
          product_type: p.product_type as 'offer' | 'request',
          status: p.status as 'available' | 'unavailable' | 'delivered',
        })));
      }
    } else { setLinkedProducts([]); }
  };

  const fetchLinkedPolls = async () => {
    const { data: polls } = await supabase.from('polls').select('*').eq('task_id', task.id).order('created_at', { ascending: false });
    if (polls && polls.length > 0) {
      const creatorIds = [...new Set(polls.map(p => p.created_by))];
      const pollIds = polls.map(p => p.id);
      const [profilesRes, optionsRes, votesRes] = await Promise.all([
        supabase.from('public_profiles').select('*').in('id', creatorIds),
        supabase.from('poll_options').select('*').in('poll_id', pollIds),
        supabase.from('poll_votes').select('*').in('poll_id', pollIds),
      ]);
      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      setLinkedPolls(polls.map(p => ({
        ...p, creator: profileMap.get(p.created_by) as Profile,
        status: p.status as 'active' | 'closed',
        options: optionsRes.data?.filter(o => o.poll_id === p.id) || [],
        votes: votesRes.data?.filter(v => v.poll_id === p.id) || [],
      })));
    } else { setLinkedPolls([]); }
  };

  useEffect(() => {
    setTasksLoading(true);
    setProductsLoading(true);
    Promise.all([fetchRelatedTasks(), fetchLinkedProducts(), fetchLinkedPolls()])
      .finally(() => setProductsLoading(false));
  }, [task.id]);

  const handleUnlinkProduct = async (productId: string) => {
    await supabase.from('task_products').delete().eq('task_id', task.id).eq('product_id', productId);
    toast({ title: language === 'pt' ? 'Produto desvinculado' : 'Product unlinked' });
    fetchLinkedProducts();
  };

  const handleLinkProduct = async (productId: string) => {
    setLinking(true);
    const { error } = await supabase.from('task_products').insert({ task_id: task.id, product_id: productId });
    if (!error) {
      toast({ title: language === 'pt' ? 'Produto vinculado!' : 'Product linked!' });
      await fetchLinkedProducts();
      setShowLinkProductModal(false);
    }
    setLinking(false);
  };

  const openLinkModal = async () => {
    const linkedIds = linkedProducts.map(p => p.id);
    const { data } = await supabase.from('products').select('*').eq('created_by', user?.id || '').order('created_at', { ascending: false });
    setAvailableProducts((data || []).filter(p => !linkedIds.includes(p.id)).map(p => ({
      ...p, product_type: p.product_type as 'offer' | 'request', status: p.status as 'available' | 'unavailable' | 'delivered',
    })));
    setSearchProduct('');
    setShowLinkProductModal(true);
  };

  const totalRelated = (parentTask ? 1 : 0) + childTasks.length + siblingTasks.length;
  const allRelated = [
    ...(parentTask ? [{ task: parentTask, label: language === 'pt' ? '🔼 Tarefa Mãe' : '🔼 Parent Task' }] : []),
    ...childTasks.map(t => ({ task: t, label: language === 'pt' ? '🔽 Subtarefa' : '🔽 Subtask' })),
    ...siblingTasks.map(t => ({ task: t, label: language === 'pt' ? '↔ Tarefa Irmã' : '↔ Sibling Task' })),
  ];

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', count: totalRelated, icon: <GitBranch className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', count: linkedProducts.length, icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Enquetes' : 'Polls', count: linkedPolls.length, icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const filteredProducts = availableProducts.filter(p => p.title.toLowerCase().includes(searchProduct.toLowerCase()));
  const totalVotes = (poll: Poll) => poll.votes?.length || 0;

  return (
    <>
      {embedded ? (
        <div className="space-y-3 pt-2">
          {/* Tab Bar */}
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            {language === 'pt' ? 'Ações Relacionadas' : 'Related Actions'}
          </h4>
      )}

        {/* Tab Bar */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
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

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {tasksLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : totalRelated > 0 ? (
              <>
                {allRelated.slice(0, MAX_VISIBLE).map(({ task: relatedTask, label }) => (
                  <div key={relatedTask.id} className="relative">
                    <span className="text-[10px] text-muted-foreground font-medium absolute -top-1 left-2 bg-card px-1 z-10">{label}</span>
                    <TaskCardMini task={relatedTask} onClick={() => onTaskClick(relatedTask)} completionDate={relatedTask.status === 'completed' ? relatedTask.updated_at : undefined} />
                  </div>
                ))}
                {allRelated.length > MAX_VISIBLE && (
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAllModal(true)}>
                    {language === 'pt' ? `Ver mais (${allRelated.length - MAX_VISIBLE})` : `See more (${allRelated.length - MAX_VISIBLE})`}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhuma tarefa relacionada.' : 'No related tasks.'}</p>
            )}
            {!isCompleted && (isOwner || isApprovedCollaborator) && onCreateSubtask && (
              <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => onCreateSubtask(task)}>
                <Plus className="w-3.5 h-3.5" /><GitBranch className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Criar Subtarefa' : 'Create Subtask'}
              </Button>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-2">
            {productsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : linkedProducts.length > 0 ? (
              linkedProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => onOpenProduct?.(product)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${product.product_type === 'offer' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')} · {language === 'pt' ? 'Qtd' : 'Qty'}: {product.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${product.status === 'available' ? 'bg-emerald-500/10 text-emerald-600' : product.status === 'delivered' ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                      {product.status === 'available' ? (language === 'pt' ? 'Disponível' : 'Available') : product.status === 'delivered' ? (language === 'pt' ? 'Entregue' : 'Delivered') : (language === 'pt' ? 'Indisponível' : 'Unavailable')}
                    </span>
                    {isOwner && !isCompleted && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleUnlinkProduct(product.id); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhum produto vinculado.' : 'No linked products.'}</p>
            )}
            {isOwner && !isCompleted && (
              <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => onCreateProduct?.(task.id)}>
                <Plus className="w-3.5 h-3.5" /><Package className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Criar Produto' : 'Create Product'}
              </Button>
            )}
          </div>
        )}

        {/* Polls Tab */}
        {activeTab === 'polls' && (
          <div className="space-y-2">
            {productsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : linkedPolls.length > 0 ? (
              linkedPolls.map(poll => (
                <div key={poll.id} className="bg-muted/50 rounded-lg px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{poll.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${poll.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {poll.status === 'active' ? (language === 'pt' ? 'Ativa' : 'Active') : (language === 'pt' ? 'Encerrada' : 'Closed')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{poll.options?.length || 0} {language === 'pt' ? 'opções' : 'options'}</span>
                    <span>·</span>
                    <span>{totalVotes(poll)} {language === 'pt' ? 'votos' : 'votes'}</span>
                  </div>
                  {poll.options && poll.options.length > 0 && (
                    <div className="space-y-1">
                      {poll.options.slice(0, 3).map(option => {
                        const optionVotes = poll.votes?.filter(v => v.option_id === option.id).length || 0;
                        const total = totalVotes(poll);
                        const pct = total > 0 ? (optionVotes / total) * 100 : 0;
                        return (
                          <div key={option.id} className="flex items-center gap-2">
                            <span className="text-xs truncate w-20 flex-shrink-0">{option.label}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhuma enquete vinculada.' : 'No linked polls.'}</p>
            )}
            {isOwner && !isCompleted && onCreatePoll && (
              <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => onCreatePoll(task.id)}>
                <Plus className="w-3.5 h-3.5" /><BarChart3 className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Criar Enquete' : 'Create Poll'}
              </Button>
            )}
          </div>
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
            {parentTask && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{language === 'pt' ? '🔼 Tarefa Mãe' : '🔼 Parent Task'}</p>
                <TaskCardMini task={parentTask} onClick={() => { setShowAllModal(false); onTaskClick(parentTask); }} completionDate={parentTask.status === 'completed' ? parentTask.updated_at : undefined} />
              </div>
            )}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1">{language === 'pt' ? '📌 Tarefa Atual' : '📌 Current Task'}</p>
              <p className="text-sm font-medium">{task.title}</p>
            </div>
            {childTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{language === 'pt' ? `🔽 Subtarefas (${childTasks.length})` : `🔽 Subtasks (${childTasks.length})`}</p>
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  {childTasks.map(child => <TaskCardMini key={child.id} task={child} onClick={() => { setShowAllModal(false); onTaskClick(child); }} completionDate={child.status === 'completed' ? child.updated_at : undefined} />)}
                </div>
              </div>
            )}
            {siblingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{language === 'pt' ? `↔ Tarefas Irmãs (${siblingTasks.length})` : `↔ Sibling Tasks (${siblingTasks.length})`}</p>
                <div className="space-y-2">
                  {siblingTasks.map(sibling => <TaskCardMini key={sibling.id} task={sibling} onClick={() => { setShowAllModal(false); onTaskClick(sibling); }} completionDate={sibling.status === 'completed' ? sibling.updated_at : undefined} />)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Product Modal */}
      <Dialog open={showLinkProductModal} onOpenChange={setShowLinkProductModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Vincular Produto' : 'Link Product'}</DialogTitle>
          </DialogHeader>
          <Input placeholder={language === 'pt' ? 'Buscar produto...' : 'Search product...'} value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredProducts.length > 0 ? filteredProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleLinkProduct(product.id)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')}</p>
                </div>
                <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">{language === 'pt' ? 'Nenhum produto disponível.' : 'No products available.'}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
