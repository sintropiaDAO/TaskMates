import { useState, useEffect, useMemo } from 'react';
import { GitBranch, Package, BarChart3, Plus, Link as LinkIcon, X, Loader2, Eye, ArrowUp, ArrowDown, Calendar, Sparkles } from 'lucide-react';
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
type TaskFilter = 'all' | 'open' | 'completed';
type ProductFilter = 'all' | 'offer' | 'request';
type PollFilter = 'all' | 'active' | 'closed';
type SortField = 'date' | 'relevance';
type SortDirection = 'desc' | 'asc';
type SortMode = 'newest' | 'oldest' | 'most_relevant' | 'least_relevant';

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

  // Filters
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [pollFilter, setPollFilter] = useState<PollFilter>('all');
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const sortMode: SortMode = sortField === 'date' 
    ? (sortDirection === 'desc' ? 'newest' : 'oldest') 
    : (sortDirection === 'desc' ? 'most_relevant' : 'least_relevant');
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Tasks state
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [childTasks, setChildTasks] = useState<Task[]>([]);
  const [siblingTasks, setSiblingTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);
  const [showAllModalType, setShowAllModalType] = useState<TabType>('tasks');

  // Products state
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const [showLinkProductModal, setShowLinkProductModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [linking, setLinking] = useState(false);

  // Polls state
  const [linkedPolls, setLinkedPolls] = useState<Poll[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Request counts for relevance scoring
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});

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
    const enrichedChildren = children ? await enrichTasks(children) : [];
    setChildTasks(enrichedChildren);
    setSiblingTasks(siblings);
    setTasksLoading(false);

    // Fetch request counts for all related task IDs
    const allTaskIds = [
      ...(parent ? [parent.id] : []),
      ...enrichedChildren.map(t => t.id),
      ...siblings.map(t => t.id),
    ];
    if (allTaskIds.length > 0) {
      const { data: collabs } = await supabase
        .from('task_collaborators')
        .select('task_id')
        .in('task_id', allTaskIds)
        .eq('status', 'request');
      const counts: Record<string, number> = {};
      collabs?.forEach(c => { counts[c.task_id] = (counts[c.task_id] || 0) + 1; });
      setRequestCounts(counts);
    }
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

  // --- Relevance scoring ---
  const getTaskRelevance = (t: Task): number => {
    const upvotes = t.upvotes || 0;
    const requests = requestCounts[t.id] || 0;
    const score = upvotes * requests;
    if (score > 0) return score;
    // Fallback: total interactions
    return (t.upvotes || 0) + (t.downvotes || 0) + (t.likes || 0) + (t.dislikes || 0);
  };

  const getProductRelevance = (p: Product): number => {
    const upvotes = p.upvotes || 0;
    const downvotes = p.downvotes || 0;
    return upvotes + downvotes;
  };

  const getPollRelevance = (p: Poll): number => {
    const upvotes = p.upvotes || 0;
    const votes = p.votes?.length || 0;
    const score = upvotes * votes;
    if (score > 0) return score;
    return upvotes + (p.downvotes || 0) + votes;
  };

  // --- Sorting ---
  function sortItems<T>(items: T[], getDate: (item: T) => string, getRelevance: (item: T) => number): T[] {
    const sorted = [...items];
    switch (sortMode) {
      case 'newest': return sorted.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());
      case 'oldest': return sorted.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime());
      case 'most_relevant': return sorted.sort((a, b) => getRelevance(b) - getRelevance(a));
      case 'least_relevant': return sorted.sort((a, b) => getRelevance(a) - getRelevance(b));
      default: return sorted;
    }
  }

  // --- Filtered & sorted data ---
  const allRelated = [
    ...(parentTask ? [{ task: parentTask, label: language === 'pt' ? '🔼 Tarefa Mãe' : '🔼 Parent Task' }] : []),
    ...childTasks.map(t => ({ task: t, label: language === 'pt' ? '🔽 Subtarefa' : '🔽 Subtask' })),
    ...siblingTasks.map(t => ({ task: t, label: language === 'pt' ? '↔ Tarefa Irmã' : '↔ Sibling Task' })),
  ];

  const filteredRelated = useMemo(() => {
    const filtered = taskFilter === 'all'
      ? allRelated
      : allRelated.filter(r => taskFilter === 'completed' ? r.task.status === 'completed' : r.task.status !== 'completed');
    return sortItems(filtered, r => r.task.created_at, r => getTaskRelevance(r.task));
  }, [allRelated, taskFilter, sortMode, requestCounts]);

  const filteredLinkedProducts = useMemo(() => {
    const filtered = productFilter === 'all'
      ? linkedProducts
      : linkedProducts.filter(p => p.product_type === productFilter);
    return sortItems(filtered, p => p.created_at, getProductRelevance);
  }, [linkedProducts, productFilter, sortMode]);

  const filteredLinkedPolls = useMemo(() => {
    const filtered = pollFilter === 'all'
      ? linkedPolls
      : linkedPolls.filter(p => pollFilter === 'active' ? p.status === 'active' : p.status === 'closed');
    return sortItems(filtered, p => p.created_at, getPollRelevance);
  }, [linkedPolls, pollFilter, sortMode]);

  const totalRelated = (parentTask ? 1 : 0) + childTasks.length + siblingTasks.length;

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', count: totalRelated, icon: <GitBranch className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', count: linkedProducts.length, icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Enquetes' : 'Polls', count: linkedPolls.length, icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const filteredProductsForModal = availableProducts.filter(p => p.title.toLowerCase().includes(searchProduct.toLowerCase()));
  const totalVotes = (poll: Poll) => poll.votes?.length || 0;

  const openShowAllModal = (type: TabType) => {
    setShowAllModalType(type);
    setShowAllModal(true);
  };

  // --- Sort toggle buttons ---
  const SortToggleButtons = () => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => toggleSort('date')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
          sortField === 'date'
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <Calendar className="w-3 h-3" />
        {language === 'pt' ? 'Data' : 'Date'}
        {sortField === 'date' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
      <button
        onClick={() => toggleSort('relevance')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
          sortField === 'relevance'
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        {language === 'pt' ? 'Relevância' : 'Relevance'}
        {sortField === 'relevance' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
    </div>
  );

  // --- Filter chip component ---
  const FilterChips = ({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: any) => void }) => (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            value === opt.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  // --- Product card with differentiated styles ---
  const ProductItem = ({ product }: { product: Product }) => {
    const isInactive = product.status === 'delivered' || product.status === 'unavailable';
    return (
      <div
        className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
          isInactive ? 'bg-muted/30 opacity-60' : 'bg-muted/50 hover:bg-muted'
        }`}
        onClick={() => onOpenProduct?.(product)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isInactive
              ? 'bg-muted text-muted-foreground'
              : product.product_type === 'offer'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-orange-500/10 text-orange-600'
          }`}>
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${isInactive ? 'line-through text-muted-foreground' : ''}`}>{product.title}</p>
            <p className="text-xs text-muted-foreground">
              {product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')} · {language === 'pt' ? 'Qtd' : 'Qty'}: {product.quantity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            product.status === 'available' ? 'bg-emerald-500/10 text-emerald-600' :
            product.status === 'delivered' ? 'bg-blue-500/10 text-blue-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {product.status === 'available' ? (language === 'pt' ? 'Disponível' : 'Available') :
             product.status === 'delivered' ? (language === 'pt' ? 'Entregue' : 'Delivered') :
             (language === 'pt' ? 'Indisponível' : 'Unavailable')}
          </span>
          {isOwner && !isCompleted && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleUnlinkProduct(product.id); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // --- Poll card ---
  const PollItem = ({ poll }: { poll: Poll }) => (
    <div className={`rounded-lg px-3 py-2.5 space-y-2 ${poll.status === 'closed' ? 'bg-muted/30 opacity-70' : 'bg-muted/50'}`}>
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
  );

  return (
    <>
      <div className={embedded ? 'space-y-3 pt-2' : 'rounded-xl border border-border bg-card p-4 space-y-3'}>
        {!embedded && (
          <h4 className="font-medium flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            {language === 'pt' ? 'Ações Relacionadas' : 'Related Actions'}
          </h4>
        )}

        {/* Sort Controls */}
        <SortToggleButtons />

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
            {totalRelated > 0 && (
              <FilterChips
                value={taskFilter}
                onChange={setTaskFilter}
                options={[
                  { key: 'all', label: language === 'pt' ? 'Todas' : 'All' },
                  { key: 'open', label: language === 'pt' ? 'Em aberto' : 'Open' },
                  { key: 'completed', label: language === 'pt' ? 'Concluídas' : 'Completed' },
                ]}
              />
            )}
            {tasksLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filteredRelated.length > 0 ? (
              <>
                {filteredRelated.slice(0, MAX_VISIBLE).map(({ task: relatedTask, label }) => (
                  <div key={relatedTask.id} className="relative">
                    <span className="text-[10px] text-muted-foreground font-medium absolute -top-1 left-2 bg-card px-1 z-10">{label}</span>
                    <TaskCardMini task={relatedTask} onClick={() => onTaskClick(relatedTask)} completionDate={relatedTask.status === 'completed' ? relatedTask.updated_at : undefined} />
                  </div>
                ))}
                {filteredRelated.length > MAX_VISIBLE && (
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => openShowAllModal('tasks')}>
                    <Eye className="w-3.5 h-3.5" />
                    {language === 'pt' ? `Ver todas (${filteredRelated.length})` : `See all (${filteredRelated.length})`}
                  </Button>
                )}
              </>
            ) : totalRelated > 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">{language === 'pt' ? 'Nenhuma tarefa com este filtro.' : 'No tasks with this filter.'}</p>
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
            {linkedProducts.length > 0 && (
              <FilterChips
                value={productFilter}
                onChange={setProductFilter}
                options={[
                  { key: 'all', label: language === 'pt' ? 'Todos' : 'All' },
                  { key: 'offer', label: language === 'pt' ? 'Ofertas' : 'Offers' },
                  { key: 'request', label: language === 'pt' ? 'Solicitações' : 'Requests' },
                ]}
              />
            )}
            {productsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filteredLinkedProducts.length > 0 ? (
              <>
                {filteredLinkedProducts.slice(0, MAX_VISIBLE).map(product => (
                  <ProductItem key={product.id} product={product} />
                ))}
                {filteredLinkedProducts.length > MAX_VISIBLE && (
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => openShowAllModal('products')}>
                    <Eye className="w-3.5 h-3.5" />
                    {language === 'pt' ? `Ver todos (${filteredLinkedProducts.length})` : `See all (${filteredLinkedProducts.length})`}
                  </Button>
                )}
              </>
            ) : linkedProducts.length > 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">{language === 'pt' ? 'Nenhum produto com este filtro.' : 'No products with this filter.'}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhum produto vinculado.' : 'No linked products.'}</p>
            )}
            {(isOwner || isApprovedCollaborator) && !isCompleted && (
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
            {linkedPolls.length > 0 && (
              <FilterChips
                value={pollFilter}
                onChange={setPollFilter}
                options={[
                  { key: 'all', label: language === 'pt' ? 'Todas' : 'All' },
                  { key: 'active', label: language === 'pt' ? 'Em votação' : 'Active' },
                  { key: 'closed', label: language === 'pt' ? 'Concluídas' : 'Closed' },
                ]}
              />
            )}
            {productsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filteredLinkedPolls.length > 0 ? (
              <>
                {filteredLinkedPolls.slice(0, MAX_VISIBLE).map(poll => (
                  <PollItem key={poll.id} poll={poll} />
                ))}
                {filteredLinkedPolls.length > MAX_VISIBLE && (
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => openShowAllModal('polls')}>
                    <Eye className="w-3.5 h-3.5" />
                    {language === 'pt' ? `Ver todas (${filteredLinkedPolls.length})` : `See all (${filteredLinkedPolls.length})`}
                  </Button>
                )}
              </>
            ) : linkedPolls.length > 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">{language === 'pt' ? 'Nenhuma enquete com este filtro.' : 'No polls with this filter.'}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{language === 'pt' ? 'Nenhuma enquete vinculada.' : 'No linked polls.'}</p>
            )}
            {(isOwner || isApprovedCollaborator) && !isCompleted && onCreatePoll && (
              <Button variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => onCreatePoll(task.id)}>
                <Plus className="w-3.5 h-3.5" /><BarChart3 className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Criar Enquete' : 'Create Poll'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* See All Modal */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showAllModalType === 'tasks' && <><GitBranch className="w-5 h-5 text-primary" /> {language === 'pt' ? 'Todas as Tarefas' : 'All Tasks'}</>}
              {showAllModalType === 'products' && <><Package className="w-5 h-5 text-primary" /> {language === 'pt' ? 'Todos os Produtos' : 'All Products'}</>}
              {showAllModalType === 'polls' && <><BarChart3 className="w-5 h-5 text-primary" /> {language === 'pt' ? 'Todas as Enquetes' : 'All Polls'}</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {showAllModalType === 'tasks' && (
              <>
                {parentTask && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{language === 'pt' ? '🔼 Tarefa Mãe' : '🔼 Parent Task'}</p>
                    <TaskCardMini task={parentTask} onClick={() => { setShowAllModal(false); onTaskClick(parentTask); }} completionDate={parentTask.status === 'completed' ? parentTask.updated_at : undefined} />
                  </div>
                )}
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-2">
                  <p className="text-xs font-medium text-primary mb-1">{language === 'pt' ? '📌 Tarefa Atual' : '📌 Current Task'}</p>
                  <p className="text-sm font-medium">{task.title}</p>
                </div>
                {childTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{language === 'pt' ? `🔽 Subtarefas (${childTasks.length})` : `🔽 Subtasks (${childTasks.length})`}</p>
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      {childTasks.map(child => <TaskCardMini key={child.id} task={child} onClick={() => { setShowAllModal(false); onTaskClick(child); }} completionDate={child.status === 'completed' ? child.updated_at : undefined} />)}
                    </div>
                  </div>
                )}
                {siblingTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{language === 'pt' ? `↔ Tarefas Irmãs (${siblingTasks.length})` : `↔ Sibling Tasks (${siblingTasks.length})`}</p>
                    <div className="space-y-2">
                      {siblingTasks.map(sibling => <TaskCardMini key={sibling.id} task={sibling} onClick={() => { setShowAllModal(false); onTaskClick(sibling); }} completionDate={sibling.status === 'completed' ? sibling.updated_at : undefined} />)}
                    </div>
                  </div>
                )}
              </>
            )}
            {showAllModalType === 'products' && filteredLinkedProducts.map(product => (
              <ProductItem key={product.id} product={product} />
            ))}
            {showAllModalType === 'polls' && filteredLinkedPolls.map(poll => (
              <PollItem key={poll.id} poll={poll} />
            ))}
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
            {filteredProductsForModal.length > 0 ? filteredProductsForModal.map(product => (
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
