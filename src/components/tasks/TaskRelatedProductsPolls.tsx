import { useState, useEffect } from 'react';
import { Package, BarChart3, Plus, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TagBadge } from '@/components/ui/tag-badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { Product, Poll, Tag, Profile } from '@/types';

interface TaskRelatedProductsPollsProps {
  taskId: string;
  isOwner: boolean;
  isCompleted: boolean;
  onOpenProduct?: (product: Product) => void;
  onCreatePoll?: (taskId: string) => void;
}

export function TaskRelatedProductsPolls({
  taskId,
  isOwner,
  isCompleted,
  onOpenProduct,
  onCreatePoll,
}: TaskRelatedProductsPollsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { getTranslatedName } = useTags();
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const [linkedPolls, setLinkedPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkProductModal, setShowLinkProductModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [linking, setLinking] = useState(false);

  const fetchLinkedProducts = async () => {
    const { data: links } = await supabase
      .from('task_products')
      .select('product_id')
      .eq('task_id', taskId);

    if (links && links.length > 0) {
      const productIds = links.map(l => l.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (products) {
        const creatorIds = [...new Set(products.map(p => p.created_by))];
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('*')
          .in('id', creatorIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        setLinkedProducts(products.map(p => ({
          ...p,
          creator: profileMap.get(p.created_by) as Profile,
          product_type: p.product_type as 'offer' | 'request',
          status: p.status as 'available' | 'unavailable' | 'delivered',
        })));
      }
    } else {
      setLinkedProducts([]);
    }
  };

  const fetchLinkedPolls = async () => {
    const { data: polls } = await supabase
      .from('polls')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

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
        ...p,
        creator: profileMap.get(p.created_by) as Profile,
        status: p.status as 'active' | 'closed',
        options: optionsRes.data?.filter(o => o.poll_id === p.id) || [],
        votes: votesRes.data?.filter(v => v.poll_id === p.id) || [],
      })));
    } else {
      setLinkedPolls([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLinkedProducts(), fetchLinkedPolls()]).finally(() => setLoading(false));
  }, [taskId]);

  const handleLinkProduct = async (productId: string) => {
    setLinking(true);
    const { error } = await supabase
      .from('task_products')
      .insert({ task_id: taskId, product_id: productId });

    if (!error) {
      toast({ title: language === 'pt' ? 'Produto vinculado!' : 'Product linked!' });
      await fetchLinkedProducts();
      setShowLinkProductModal(false);
    } else {
      toast({ title: language === 'pt' ? 'Erro ao vincular' : 'Error linking', variant: 'destructive' });
    }
    setLinking(false);
  };

  const handleUnlinkProduct = async (productId: string) => {
    await supabase
      .from('task_products')
      .delete()
      .eq('task_id', taskId)
      .eq('product_id', productId);
    toast({ title: language === 'pt' ? 'Produto desvinculado' : 'Product unlinked' });
    fetchLinkedProducts();
  };

  const openLinkModal = async () => {
    const linkedIds = linkedProducts.map(p => p.id);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('created_by', user?.id || '')
      .order('created_at', { ascending: false });

    setAvailableProducts(
      (data || [])
        .filter(p => !linkedIds.includes(p.id))
        .map(p => ({
          ...p,
          product_type: p.product_type as 'offer' | 'request',
          status: p.status as 'available' | 'unavailable' | 'delivered',
        }))
    );
    setSearchProduct('');
    setShowLinkProductModal(true);
  };

  const filteredProducts = availableProducts.filter(p =>
    p.title.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const totalVotes = (poll: Poll) => poll.votes?.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Related Products */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          {language === 'pt' ? 'Produtos Relacionados' : 'Related Products'}
          {linkedProducts.length > 0 && (
            <span className="text-xs text-muted-foreground">({linkedProducts.length})</span>
          )}
        </h4>

        {linkedProducts.length > 0 ? (
          <div className="space-y-2">
            {linkedProducts.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => onOpenProduct?.(product)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    product.product_type === 'offer' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.product_type === 'offer'
                        ? (language === 'pt' ? 'Oferta' : 'Offer')
                        : (language === 'pt' ? 'Solicitação' : 'Request')
                      } · {language === 'pt' ? 'Qtd' : 'Qty'}: {product.quantity}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleUnlinkProduct(product.id); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {language === 'pt' ? 'Nenhum produto vinculado.' : 'No linked products.'}
          </p>
        )}

        {isOwner && !isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
            onClick={openLinkModal}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            {language === 'pt' ? 'Vincular Produto' : 'Link Product'}
          </Button>
        )}
      </div>

      {/* Related Polls */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {language === 'pt' ? 'Enquetes Relacionadas' : 'Related Polls'}
          {linkedPolls.length > 0 && (
            <span className="text-xs text-muted-foreground">({linkedPolls.length})</span>
          )}
        </h4>

        {linkedPolls.length > 0 ? (
          <div className="space-y-2">
            {linkedPolls.map(poll => (
              <div
                key={poll.id}
                className="bg-muted/50 rounded-lg px-3 py-2.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{poll.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    poll.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {poll.status === 'active' ? (language === 'pt' ? 'Ativa' : 'Active') : (language === 'pt' ? 'Encerrada' : 'Closed')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{poll.options?.length || 0} {language === 'pt' ? 'opções' : 'options'}</span>
                  <span>·</span>
                  <span>{totalVotes(poll)} {language === 'pt' ? 'votos' : 'votes'}</span>
                </div>
                {/* Mini progress bars for top options */}
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
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {language === 'pt' ? 'Nenhuma enquete vinculada.' : 'No linked polls.'}
          </p>
        )}

        {isOwner && !isCompleted && onCreatePoll && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
            onClick={() => onCreatePoll(taskId)}
          >
            <Plus className="w-3.5 h-3.5" />
            <BarChart3 className="w-3.5 h-3.5" />
            {language === 'pt' ? 'Criar Enquete' : 'Create Poll'}
          </Button>
        )}
      </div>

      {/* Link Product Modal */}
      <Dialog open={showLinkProductModal} onOpenChange={setShowLinkProductModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Vincular Produto' : 'Link Product'}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder={language === 'pt' ? 'Buscar produto...' : 'Search product...'}
            value={searchProduct}
            onChange={e => setSearchProduct(e.target.value)}
          />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleLinkProduct(product.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.product_type === 'offer'
                        ? (language === 'pt' ? 'Oferta' : 'Offer')
                        : (language === 'pt' ? 'Solicitação' : 'Request')
                      }
                    </p>
                  </div>
                  <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {language === 'pt' ? 'Nenhum produto disponível.' : 'No products available.'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
