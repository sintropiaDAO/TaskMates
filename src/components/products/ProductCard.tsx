import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, AlertTriangle, CheckCircle, ShoppingCart, Truck, BadgeCheck, ArrowUp, ArrowDown, MessageSquare, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { ProductQuantityModal } from './ProductQuantityModal';
import { useNavigate } from 'react-router-dom';
import { FlagReportButton } from '@/components/reports/FlagReportButton';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onParticipate: (productId: string, role: 'supplier' | 'requester', quantity: number) => Promise<any>;
  onVoteProduct?: (productId: string, voteType: 'up' | 'down') => Promise<boolean>;
  getUserProductVote?: (productId: string) => Promise<string | null>;
  recommendationReasons?: string[];
  isNew?: boolean;
  isHighlighted?: boolean;
}

export function ProductCard({ product, onClick, onParticipate, onVoteProduct, getUserProductVote, recommendationReasons, isNew, isHighlighted = false }: ProductCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { getTranslatedName } = useTags();
  const navigate = useNavigate();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const isDelivered = product.status === 'delivered';
  const isOwner = user?.id === product.created_by;

  const actionRole: 'supplier' | 'requester' = product.product_type === 'offer' ? 'requester' : 'supplier';
  const actionLabel = product.product_type === 'offer'
    ? (language === 'pt' ? 'Receber' : 'Receive')
    : (language === 'pt' ? 'Fornecer' : 'Supply');

  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    if (getUserProductVote) {
      getUserProductVote(product.id).then(setUserVote);
    }
    // Fetch comment count
    supabase
      .from('product_comments')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id)
      .then(({ count }) => setCommentCount(count || 0));
  }, [product.id, product.upvotes, product.downvotes]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!onVoteProduct || voting) return;
    setVoting(true);
    await onVoteProduct(product.id, voteType);
    if (getUserProductVote) {
      const newVote = await getUserProductVote(product.id);
      setUserVote(newVote);
    }
    setVoting(false);
  };

  const netVotes = (product.upvotes || 0) - (product.downvotes || 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className={`relative glass rounded-xl p-5 cursor-pointer transition-all hover:shadow-soft overflow-hidden border-t-[3px] ${
          product.product_type === 'offer' ? 'border-t-amber-500' : 'border-t-violet-500'
        } ${isDelivered ? 'border-b border-x border-amber-500/20' : ''} ${product.priority === 'high' ? 'ring-2 ring-orange-500/50 bg-orange-500/5' : ''} ${
          isNew && !product.priority ? 'ring-1 ring-primary/30 bg-primary/5' : ''
        }`}
        onClick={onClick}
      >
        {isNew && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
        )}
        {/* Type badge */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
            <Package className="w-3 h-3" />
            {language === 'pt' ? 'Produto' : 'Product'}
          </span>
          {product.priority === 'high' && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
              <AlertTriangle className="w-3 h-3" />
              {language === 'pt' ? 'Alta' : 'High'}
            </span>
          )}
          {isDelivered && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <CheckCircle className="w-3 h-3" />
              {language === 'pt' ? 'Entregue' : 'Delivered'}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.product_type === 'offer' ? 'bg-amber-500/10 text-amber-500' : 'bg-violet-500/10 text-violet-500'
          }`}>
            {product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')}
          </span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar userId={product.created_by} name={product.creator?.full_name} avatarUrl={product.creator?.avatar_url} size="lg" className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm truncate">{product.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
              {product.creator?.is_verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(product.created_at), language === 'pt' ? "dd 'de' MMM" : "MMM dd", { locale: dateLocale })}
            </p>
          </div>
        </div>

        <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
        {product.description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{product.description}</p>}

        {product.image_url && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img src={product.image_url} alt={product.title} className="w-full h-32 object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        )}

        {/* Stock info */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground font-medium">
            {language === 'pt' ? `Estoque: ${product.quantity}` : `Stock: ${product.quantity}`}
          </span>
          {product.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {product.location}
            </span>
          )}
        </div>

        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4" onClick={(e) => e.stopPropagation()}>
            {product.tags.slice(0, 3).map(tag => (
              <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" displayName={getTranslatedName(tag)} onClick={() => navigate(`/tags/${tag.id}`)} />
            ))}
            {product.tags.length > 3 && <span className="text-xs text-muted-foreground">+{product.tags.length - 3}</span>}
          </div>
        )}

        {/* Vote buttons + Action button row */}
        <div className="pt-3 border-t border-border/50 flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleVote('up')}
                    disabled={voting}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      userVote === 'up'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    {product.upvotes || 0}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{language === 'pt' ? 'Impulsionar' : 'Boost'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleVote('down')}
                    disabled={voting}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      userVote === 'down'
                        ? 'bg-destructive/15 text-destructive'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    {product.downvotes || 0}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{language === 'pt' ? 'Suprimir' : 'Suppress'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onClick()}
                    className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full transition-colors text-muted-foreground hover:bg-muted"
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium">{commentCount}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{language === 'pt' ? 'Comentários' : 'Comments'}</TooltipContent>
              </Tooltip>
              <FlagReportButton entityType="product" entityId={product.id} entityTitle={product.title} />
            </div>
          </TooltipProvider>

          {!isOwner && !isDelivered && product.status !== 'delivered' && product.quantity > 0 && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`text-xs gap-1 ${
                      product.product_type === 'offer'
                        ? 'border-violet-500/30 text-violet-500 hover:bg-violet-500/10'
                        : 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                    }`}
                    onClick={() => setShowQuantityModal(true)}
                  >
                    {product.product_type === 'offer' ? <ShoppingCart className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                    {actionLabel}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {product.product_type === 'offer'
                    ? (language === 'pt' ? 'Receber' : 'Receive')
                    : (language === 'pt' ? 'Colaborar' : 'Collaborate')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </motion.div>

      <ProductQuantityModal
        open={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        maxQuantity={product.quantity}
        onConfirm={async (qty) => {
          await onParticipate(product.id, actionRole, qty);
          setShowQuantityModal(false);
        }}
      />
    </>
  );
}
