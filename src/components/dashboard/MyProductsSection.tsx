import { useState, useEffect, useMemo } from 'react';
import { Package, Truck, ShoppingCart, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Product, Profile } from '@/types';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface MyProductsSectionProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

type DeliverFilter = 'all' | 'with_requester' | 'without_requester';
type ReceiveFilter = 'all' | 'with_supplier' | 'without_supplier';
type DeliveredFilter = 'all' | 'available' | 'unavailable';

const MAX_VISIBLE = 5;

interface ProductParticipation {
  product_id: string;
  role: string;
  user_id: string;
}

function ProductCardMini({ product, onClick }: { product: Product; onClick: () => void }) {
  const { language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isDelivered = product.status === 'delivered';

  const getTypeColor = () => {
    return product.product_type === 'offer' ? 'border-l-amber-500' : 'border-l-violet-500';
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/80 cursor-pointer transition-all border-l-4 ${getTypeColor()} ${isDelivered ? 'opacity-80' : ''}`}
    >
      <UserAvatar
        userId={product.created_by}
        name={product.creator?.full_name}
        avatarUrl={product.creator?.avatar_url}
        size="md"
        clickable={false}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate mb-0.5">
          {product.creator?.full_name || 'Usuário'}
        </p>
        <h4 className="font-medium text-sm line-clamp-1">{product.title}</h4>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
          {product.quantity}
        </span>
        {isDelivered && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
      </div>
    </div>
  );
}

export function MyProductsSection({ products, onProductClick }: MyProductsSectionProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [participations, setParticipations] = useState<ProductParticipation[]>([]);

  // Filters
  const [deliverFilter, setDeliverFilter] = useState<DeliverFilter>('all');
  const [receiveFilter, setReceiveFilter] = useState<ReceiveFilter>('all');
  const [deliveredFilter, setDeliveredFilter] = useState<DeliveredFilter>('all');

  // Show more
  const [showAllDeliver, setShowAllDeliver] = useState(false);
  const [showAllReceive, setShowAllReceive] = useState(false);
  const [showAllDelivered, setShowAllDelivered] = useState(false);

  useEffect(() => {
    const fetchParticipations = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('product_participants')
        .select('product_id, role, user_id');
      setParticipations(data || []);
      setLoading(false);
    };
    fetchParticipations();
  }, [user, products]);

  // Products where user is supplier (created offer OR participant as supplier)
  const supplierProductIds = useMemo(() => {
    const ids = new Set<string>();
    // Products user created as offer
    products.forEach(p => {
      if (p.created_by === user?.id && p.product_type === 'offer') ids.add(p.id);
    });
    // Products where user is participant as supplier
    participations.forEach(pp => {
      if (pp.user_id === user?.id && pp.role === 'supplier') ids.add(pp.product_id);
    });
    return ids;
  }, [products, participations, user?.id]);

  // Products where user is requester
  const requesterProductIds = useMemo(() => {
    const ids = new Set<string>();
    products.forEach(p => {
      if (p.created_by === user?.id && p.product_type === 'request') ids.add(p.id);
    });
    participations.forEach(pp => {
      if (pp.user_id === user?.id && pp.role === 'requester') ids.add(pp.product_id);
    });
    return ids;
  }, [products, participations, user?.id]);

  // Check if product has a requester participant (excluding creator)
  const hasRequester = (productId: string) => {
    return participations.some(pp => pp.product_id === productId && pp.role === 'requester' && pp.user_id !== user?.id);
  };
  const hasSupplier = (productId: string) => {
    return participations.some(pp => pp.product_id === productId && pp.role === 'supplier' && pp.user_id !== user?.id);
  };

  // TO DELIVER: products where user is supplier, not delivered
  const deliverProducts = useMemo(() => {
    const base = products.filter(p => supplierProductIds.has(p.id) && p.status !== 'delivered');
    if (deliverFilter === 'all') return base;
    if (deliverFilter === 'with_requester') return base.filter(p => hasRequester(p.id));
    return base.filter(p => !hasRequester(p.id));
  }, [products, supplierProductIds, deliverFilter, participations]);

  const deliverCounts = useMemo(() => {
    const base = products.filter(p => supplierProductIds.has(p.id) && p.status !== 'delivered');
    return {
      all: base.length,
      with_requester: base.filter(p => hasRequester(p.id)).length,
      without_requester: base.filter(p => !hasRequester(p.id)).length,
    };
  }, [products, supplierProductIds, participations]);

  // TO RECEIVE: products where user is requester, not delivered
  const receiveProducts = useMemo(() => {
    const base = products.filter(p => requesterProductIds.has(p.id) && p.status !== 'delivered');
    if (receiveFilter === 'all') return base;
    if (receiveFilter === 'with_supplier') return base.filter(p => hasSupplier(p.id));
    return base.filter(p => !hasSupplier(p.id));
  }, [products, requesterProductIds, receiveFilter, participations]);

  const receiveCounts = useMemo(() => {
    const base = products.filter(p => requesterProductIds.has(p.id) && p.status !== 'delivered');
    return {
      all: base.length,
      with_supplier: base.filter(p => hasSupplier(p.id)).length,
      without_supplier: base.filter(p => !hasSupplier(p.id)).length,
    };
  }, [products, requesterProductIds, participations]);

  // DELIVERED
  const deliveredProducts = useMemo(() => {
    const base = products.filter(p =>
      p.status === 'delivered' && (supplierProductIds.has(p.id) || requesterProductIds.has(p.id))
    );
    // For the "delivered" section, filter by availability doesn't apply to delivered items directly
    // but let's filter all products by status for the last section
    return base;
  }, [products, supplierProductIds, requesterProductIds]);

  // Last section: non-delivered products owned by user filtered by availability
  const ownedProducts = useMemo(() => {
    const base = products.filter(p => 
      (supplierProductIds.has(p.id) || requesterProductIds.has(p.id)) && p.status !== 'delivered'
    );
    return base;
  }, [products, supplierProductIds, requesterProductIds]);

  // Actually for "Entregues" with availability filter:
  const allUserProducts = useMemo(() => {
    return products.filter(p => supplierProductIds.has(p.id) || requesterProductIds.has(p.id));
  }, [products, supplierProductIds, requesterProductIds]);

  const deliveredFiltered = useMemo(() => {
    if (deliveredFilter === 'all') {
      return allUserProducts.filter(p => p.status === 'delivered' || (p.status as string) === 'unavailable');
    }
    if (deliveredFilter === 'available') {
      return allUserProducts.filter(p => p.status === 'delivered');
    }
    // 'unavailable' = status is 'unavailable'
    return allUserProducts.filter(p => p.status === 'unavailable' as any);
  }, [allUserProducts, deliveredFilter]);

  const deliveredCounts = useMemo(() => ({
    all: allUserProducts.filter(p => p.status === 'delivered' || (p.status as string) === 'unavailable').length,
    available: allUserProducts.filter(p => p.status === 'delivered').length,
    unavailable: allUserProducts.filter(p => (p.status as string) === 'unavailable').length,
  }), [allUserProducts]);

  const renderList = (
    items: Product[],
    showAll: boolean,
    setShowAll: (v: boolean) => void,
    emptyMsg: string
  ) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">{emptyMsg}</p>;
    }
    const visible = showAll ? items : items.slice(0, MAX_VISIBLE);
    const hasMore = items.length > MAX_VISIBLE;
    return (
      <div className="space-y-2">
        {visible.map(p => (
          <ProductCardMini key={p.id} product={p} onClick={() => onProductClick(p)} />
        ))}
        {hasMore && (
          <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAll(!showAll)}>
            {showAll ? <><ChevronUp className="w-4 h-4" />{language === 'pt' ? 'Ver menos' : 'Show less'}</> :
              <><ChevronDown className="w-4 h-4" />{language === 'pt' ? 'Ver mais' : 'Show more'} ({items.length - MAX_VISIBLE})</>}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A Entregar */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-success" />
              {language === 'pt' ? 'A Entregar' : 'To Deliver'}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={deliverFilter === 'all' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setDeliverFilter('all')}>
                {language === 'pt' ? 'Todos' : 'All'} ({deliverCounts.all})
              </Button>
              <Button size="sm" variant={deliverFilter === 'with_requester' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setDeliverFilter('with_requester')}>
                {language === 'pt' ? 'Com solicitador' : 'With requester'} ({deliverCounts.with_requester})
              </Button>
              <Button size="sm" variant={deliverFilter === 'without_requester' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setDeliverFilter('without_requester')}>
                {language === 'pt' ? 'Sem solicitador' : 'No requester'} ({deliverCounts.without_requester})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'pt' ? 'Produtos que você vai fornecer' : 'Products you will supply'}
          </p>
        </CardHeader>
        <CardContent>
          {renderList(deliverProducts, showAllDeliver, setShowAllDeliver,
            language === 'pt' ? 'Nenhum produto para entregar' : 'No products to deliver')}
        </CardContent>
      </Card>

      {/* A Receber */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="w-5 h-5 text-pink-500" />
              {language === 'pt' ? 'A Receber' : 'To Receive'}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={receiveFilter === 'all' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setReceiveFilter('all')}>
                {language === 'pt' ? 'Todos' : 'All'} ({receiveCounts.all})
              </Button>
              <Button size="sm" variant={receiveFilter === 'with_supplier' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setReceiveFilter('with_supplier')}>
                {language === 'pt' ? 'Com fornecedor' : 'With supplier'} ({receiveCounts.with_supplier})
              </Button>
              <Button size="sm" variant={receiveFilter === 'without_supplier' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setReceiveFilter('without_supplier')}>
                {language === 'pt' ? 'Sem fornecedor' : 'No supplier'} ({receiveCounts.without_supplier})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'pt' ? 'Produtos que você vai receber' : 'Products you will receive'}
          </p>
        </CardHeader>
        <CardContent>
          {renderList(receiveProducts, showAllReceive, setShowAllReceive,
            language === 'pt' ? 'Nenhum produto para receber' : 'No products to receive')}
        </CardContent>
      </Card>

      {/* Entregues */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-primary" />
              {language === 'pt' ? 'Entregues' : 'Delivered'}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={deliveredFilter === 'all' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setDeliveredFilter('all')}>
                {language === 'pt' ? 'Todos' : 'All'} ({deliveredCounts.all})
              </Button>
              <Button size="sm" variant={deliveredFilter === 'available' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setDeliveredFilter('available')}>
                {language === 'pt' ? 'Disponíveis' : 'Available'} ({deliveredCounts.available})
              </Button>
              <Button size="sm" variant={deliveredFilter === 'unavailable' ? 'default' : 'ghost'} className="text-xs h-7 px-2"
                onClick={() => setDeliveredFilter('unavailable')}>
                {language === 'pt' ? 'Indisponíveis' : 'Unavailable'} ({deliveredCounts.unavailable})
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'pt' ? 'Produtos já entregues ou indisponíveis' : 'Products already delivered or unavailable'}
          </p>
        </CardHeader>
        <CardContent>
          {renderList(deliveredFiltered, showAllDelivered, setShowAllDelivered,
            language === 'pt' ? 'Nenhum produto entregue' : 'No delivered products')}
        </CardContent>
      </Card>
    </div>
  );
}
