import { useEffect, useState } from 'react';
import { GitBranch, Package, BarChart3, Loader2, ListTodo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { DateSeparatedList } from '@/components/common/DateSeparatedList';
import { SectionEmptyState } from '@/components/common/SectionEmptyState';
import { PRODUCT_SAFE_COLUMNS } from '@/lib/productFields';
import { Product, Poll } from '@/types';

type TabType = 'tasks' | 'products' | 'polls';

interface EntityRelatedActionsSectionProps {
  /** The entity owning this section */
  entityType: 'product' | 'poll';
  entityId: string;
  /** Task ids already known (polls have a single task_id) */
  taskId?: string | null;
  onOpenTask?: (taskId: string) => void;
  onOpenProduct?: (product: Product) => void;
  onOpenPoll?: (poll: Poll) => void;
  onCountChange?: (count: number) => void;
}

export function EntityRelatedActionsSection({
  entityType,
  entityId,
  taskId,
  onOpenTask,
  onOpenProduct,
  onOpenPoll,
  onCountChange,
}: EntityRelatedActionsSectionProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // 1. Resolve linked task ids
      let taskIds: string[] = [];
      if (entityType === 'poll') {
        if (taskId) taskIds = [taskId];
      } else {
        const { data: links } = await supabase
          .from('task_products')
          .select('task_id')
          .eq('product_id', entityId);
        taskIds = [...new Set((links || []).map(l => l.task_id))];
      }

      if (taskIds.length === 0) {
        if (!cancelled) {
          setTasks([]); setProducts([]); setPolls([]); setLoading(false);
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
      setTasks(tasksRes.data || []);
      setProducts(siblingProducts);
      setPolls(siblingPolls);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [entityType, entityId, taskId]);

  const total = tasks.length + products.length + polls.length;

  useEffect(() => { onCountChange?.(total); }, [total]);

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'tasks', label: language === 'pt' ? 'Tarefas' : 'Tasks', count: tasks.length, icon: <GitBranch className="w-3.5 h-3.5" /> },
    { key: 'products', label: language === 'pt' ? 'Produtos' : 'Products', count: products.length, icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'polls', label: language === 'pt' ? 'Opiniões' : 'Opinions', count: polls.length, icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

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
            tasks.length === 0 ? (
              <SectionEmptyState message={language === 'pt' ? 'Nenhuma tarefa vinculada ainda.' : 'No linked tasks yet.'} />
            ) : (
              <DateSeparatedList
                items={tasks}
                language={language}
                getDate={t => t.created_at}
                getKey={t => t.id}
                renderItem={t => (
                  <div
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
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
                )}
              />
            )
          )}

          {activeTab === 'products' && (
            products.length === 0 ? (
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
            )
          )}

          {activeTab === 'polls' && (
            polls.length === 0 ? (
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
            )
          )}
        </div>
      )}
    </div>
  );
}
