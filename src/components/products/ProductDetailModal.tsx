import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Package, MapPin, User, MessageCircle, Send, CheckCircle, Loader2,
  Upload, Image, Link as LinkIcon, Settings, Trash2, ChevronDown,
  ShoppingCart, Truck, Eye, EyeOff, Users as UsersIcon, Pencil, Save, BadgeCheck,
  ThumbsUp, ThumbsDown, FileText, Star, ArrowUp, ArrowDown, Flag, ListTodo
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { StarRating } from '@/components/ui/star-rating';
import { RatingModal } from '@/components/dashboard/RatingModal';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { ShareItemButton } from '@/components/common/ShareItemButton';
import { FlagReportButton } from '@/components/reports/FlagReportButton';
import { ProductQuantityModal } from './ProductQuantityModal';
import { CommentInput } from '@/components/tasks/CommentInput';
import { Product, ProductParticipant, Profile, ProductComment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onDelete?: (productId: string) => Promise<boolean>;
  onParticipate?: (productId: string, role: 'supplier' | 'requester', quantity: number) => Promise<any>;
  onEdit?: (product: Product) => void;
}

export function ProductDetailModal({
  product, open, onClose, onRefresh, onDelete, onParticipate, onEdit
}: ProductDetailModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { getTranslatedName } = useTags();
  const { createDirectConversation } = useConversations();
  const { openChatDrawer } = useChat();
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [participants, setParticipants] = useState<ProductParticipant[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [collectiveUse, setCollectiveUse] = useState(false);
  const [productStatus, setProductStatus] = useState<'available' | 'unavailable'>('available');
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<ProductComment[]>([]);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editLocation, setEditLocation] = useState('');
  const [editPriority, setEditPriority] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Proof-based delivery
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMode, setProofMode] = useState<'file' | 'link'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product rating state
  const [productRatings, setProductRatings] = useState<any[]>([]);
  const [ratingTarget, setRatingTarget] = useState<{ userId: string; userName: string; avatarUrl: string | null; role: 'collaborator' | 'requester' | 'owner' } | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState<any[]>([]);
  const [showRelatedTasks, setShowRelatedTasks] = useState(false);

  const isOwner = user?.id === product?.created_by;
  const isDelivered = product?.status === 'delivered';

  useEffect(() => {
    if (product && open) {
      fetchParticipants();
      fetchComments();
      fetchProductRatings();
      fetchRelatedTasks();
      setCollectiveUse(product.collective_use);
      setProductStatus(product.status === 'delivered' ? 'available' : product.status as 'available' | 'unavailable');
      setEditing(false);
      setEditTitle(product.title);
      setEditDescription(product.description || '');
      setEditQuantity(product.quantity);
      setEditLocation(product.location || '');
      setEditPriority(product.priority || null);
    }
  }, [product, open]);

  const fetchRelatedTasks = async () => {
    if (!product) return;
    const { data: taskProducts } = await supabase
      .from('task_products')
      .select('task_id')
      .eq('product_id', product.id);
    if (!taskProducts || taskProducts.length === 0) {
      setRelatedTasks([]);
      return;
    }
    const taskIds = taskProducts.map(tp => tp.task_id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, task_type')
      .in('id', taskIds);
    setRelatedTasks(tasks || []);
  };

  const fetchProductRatings = async () => {
    if (!product) return;
    const { data } = await supabase
      .from('product_ratings')
      .select('*')
      .eq('product_id', product.id);
    setProductRatings(data || []);
  };

  const handleSubmitProductRating = async (rating: number, comment?: string) => {
    if (!user || !product || !ratingTarget) return;
    setSubmittingRating(true);
    const { error } = await supabase
      .from('product_ratings')
      .upsert({
        product_id: product.id,
        rated_user_id: ratingTarget.userId,
        rater_user_id: user.id,
        rating,
        comment: comment || null,
      }, { onConflict: 'product_id,rated_user_id,rater_user_id' });

    if (!error) {
      toast({ title: language === 'pt' ? 'Avaliação enviada!' : 'Rating submitted!' });
      fetchProductRatings();
    }
    setSubmittingRating(false);
    setRatingTarget(null);
  };

  const fetchParticipants = async () => {
    if (!product) return;
    const { data } = await supabase
      .from('product_participants')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: true });
    if (!data) return setParticipants([]);

    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('public_profiles').select('*').in('id', userIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    setParticipants(data.map(p => ({
      ...p,
      role: p.role as 'supplier' | 'requester',
      status: p.status as 'pending' | 'confirmed',
      profile: profileMap.get(p.user_id) as unknown as Profile,
    })));
  };

  const fetchComments = async () => {
    if (!product) return;
    const { data } = await supabase
      .from('product_comments')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('*')
        .in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(data.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) as Profile
      })));
    }
  };

  const handleAddComment = async (content: string, attachment?: { url: string; type: string; name: string }) => {
    if (!product || !user || (!content.trim() && !attachment)) return;
    const { error } = await supabase.from('product_comments').insert({
      product_id: product.id,
      user_id: user.id,
      content: content.trim(),
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
      attachment_name: attachment?.name || null
    });
    if (!error) {
      fetchComments();
      toast({ title: language === 'pt' ? 'Comentário adicionado' : 'Comment added' });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('product_comments').delete().eq('id', commentId);
    if (!error) {
      fetchComments();
      toast({ title: language === 'pt' ? 'Comentário excluído' : 'Comment deleted' });
    }
  };

  const handleRemoveParticipant = async (participantId: string, productId: string) => {
    // Get participant quantity to restore
    const { data: participant } = await supabase
      .from('product_participants')
      .select('quantity')
      .eq('id', participantId)
      .single();

    if (!participant) return;

    const { error } = await supabase
      .from('product_participants')
      .delete()
      .eq('id', participantId);

    if (error) return;

    // Restore quantity and reopen product if it was delivered
    const { data: prod } = await supabase
      .from('products')
      .select('quantity, status')
      .eq('id', productId)
      .single();

    if (prod) {
      const restoredQuantity = prod.quantity + participant.quantity;
      const updates: any = { quantity: restoredQuantity };
      if (prod.status === 'delivered') {
        updates.status = 'available';
      }
      await supabase.from('products').update(updates).eq('id', productId);
    }

    fetchParticipants();
    onRefresh?.();
    toast({ title: language === 'pt' ? 'Participante removido' : 'Participant removed' });
  };

  const nonCreatorParticipants = participants.filter(p => p.user_id !== product?.created_by);
  const hasSuppliers = participants.some(p => p.role === 'supplier' && p.user_id !== product?.created_by);
  const hasRequesters = participants.some(p => p.role === 'requester' && p.user_id !== product?.created_by);

  // product.quantity is already the remaining stock (decremented when participants are added)
  const remainingQuantity = product?.quantity || 0;

  // Only the requester can confirm delivery (for offers: the requester; for requests: the supplier who is "receiving" the request)
  // Simplification: the person who is NOT the creator and has the opposite role can confirm
  const isRequester = participants.some(p => p.role === 'requester' && p.user_id === user?.id && p.user_id !== product?.created_by);
  const isSupplierParticipant = participants.some(p => p.role === 'supplier' && p.user_id === user?.id && p.user_id !== product?.created_by);

  // For offers: requester confirms. For requests: supplier confirms (the one who accepted to supply).
  // But per user request: "apenas o solicitador possa confirmar a entrega" = only the requester
  const canConfirmDelivery = isRequester && !isDelivered;
  // Show button to requester but disable if no confirmed supplier
  const showDeliveryButton = isRequester && !isDelivered;
  const deliveryButtonEnabled = hasSuppliers || (product?.product_type === 'request' && isOwner);
  // For offer: requester sees button, needs supplier (creator is supplier)
  // For request: requester is creator, needs external supplier
  const hasConfirmedSupplier = product?.product_type === 'offer'
    ? true // creator is the supplier
    : hasSuppliers;

  const actionRole: 'supplier' | 'requester' = product?.product_type === 'offer' ? 'requester' : 'supplier';

  const handleSaveEdit = async () => {
    if (!product) return;
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        quantity: editQuantity,
        location: editLocation.trim() || null,
        priority: editPriority,
      })
      .eq('id', product.id);

    setSaving(false);
    if (error) {
      toast({ title: language === 'pt' ? 'Erro ao salvar' : 'Error saving', variant: 'destructive' });
      return;
    }
    toast({ title: language === 'pt' ? 'Produto atualizado!' : 'Product updated!' });
    setEditing(false);
    onRefresh?.();
  };

  const handleConfirmDelivery = async () => {
    if (!product || !user) return;
    setConfirming(true);

    let finalProofUrl = proofUrl;
    let proofType = 'link';

    if (proofMode === 'file' && proofFile) {
      const ext = proofFile.name.split('.').pop();
      const filePath = `product-proofs/${product.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('task-proofs').upload(filePath, proofFile);
      if (uploadError) {
        toast({ title: language === 'pt' ? 'Erro ao enviar arquivo' : 'Upload error', variant: 'destructive' });
        setConfirming(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('task-proofs').getPublicUrl(filePath);
      finalProofUrl = publicUrl;
      proofType = proofFile.type.startsWith('image') ? 'image' : 'file';
    }

    // Update participant delivery status
    await supabase
      .from('product_participants')
      .update({
        delivery_confirmed: true,
        delivery_proof_url: finalProofUrl || null,
        delivery_proof_type: proofType,
      })
      .eq('product_id', product.id)
      .eq('user_id', user.id);

    // Mark product as delivered
    await supabase.from('products').update({ status: 'delivered' }).eq('id', product.id);

    // Record SUPPLIED coin for the product creator
    if (product.created_by) {
      await supabase.rpc('record_coin_event', {
        _event_id: `SUPPLIED_${product.id}`,
        _event_type: 'PRODUCT_DELIVERED',
        _currency_key: 'SUPPLIED',
        _subject_user_id: product.created_by,
        _amount: 1,
        _meta: { product_id: product.id },
      });
    }

    toast({ title: language === 'pt' ? 'Entrega confirmada!' : 'Delivery confirmed!' });
    setShowDeliveryModal(false);
    setProofUrl('');
    setProofFile(null);
    setConfirming(false);
    onRefresh?.();
    onClose();
  };

  const handleToggleCollectiveUse = async (value: boolean) => {
    if (!product) return;
    setCollectiveUse(value);
    await supabase.from('products').update({ collective_use: value }).eq('id', product.id);
    toast({ title: language === 'pt' ? 'Configuração atualizada' : 'Setting updated' });
    onRefresh?.();
  };

  const handleStatusChange = async (status: 'available' | 'unavailable') => {
    if (!product) return;
    setProductStatus(status);
    await supabase.from('products').update({ status }).eq('id', product.id);
    toast({ title: language === 'pt' ? 'Status atualizado' : 'Status updated' });
    onRefresh?.();
  };

  const handleDelete = async () => {
    if (!product || !onDelete) return;
    setDeleting(true);
    const success = await onDelete(product.id);
    setDeleting(false);
    if (success) onClose();
  };

  const handleStartGroupChat = async () => {
    if (!product || participants.length < 2) return;
    const participantIds = [...new Set(participants.map(p => p.user_id))];
    if (participantIds.length < 2) return;
    const otherUserId = participantIds.find(id => id !== user?.id);
    if (otherUserId) {
      const conversation = await createDirectConversation(otherUserId);
      if (conversation) openChatDrawer(conversation);
    }
  };

  if (!product) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {/* Hero Section - Distinct background */}
          <div className="bg-muted/40 rounded-t-lg p-4 sm:p-6 space-y-4 border-b border-border/50">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap pr-8">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
                <Package className="w-3 h-3" />
                {language === 'pt' ? 'Produto' : 'Product'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                product.product_type === 'offer' ? 'bg-amber-500/10 text-amber-500' : 'bg-violet-500/10 text-violet-500'
              }`}>
                {product.product_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')}
              </span>
              {isDelivered && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <CheckCircle className="w-3 h-3" />
                  {language === 'pt' ? 'Entregue' : 'Delivered'}
                </span>
              )}
              {product.status === 'unavailable' && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  <EyeOff className="w-3 h-3" />
                  {language === 'pt' ? 'Indisponível' : 'Unavailable'}
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold">{product.title}</h2>
              {isOwner && !isDelivered && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    if (onEdit && product) {
                      onClose();
                      onEdit(product);
                    }
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${product.created_by}`)}>
              <UserAvatar userId={product.created_by} name={product.creator?.full_name} avatarUrl={product.creator?.avatar_url} size="sm" />
              <div>
                <p className="font-medium text-sm">{product.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(product.created_at), language === 'pt' ? "dd 'de' MMMM 'de' yyyy" : "MMMM dd, yyyy", { locale: dateLocale })}
                </p>
              </div>
            </div>

            {/* Image */}
            {product.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img src={product.image_url} alt={product.title} className="w-full max-h-48 object-cover" />
              </div>
            )}

            {product.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            )}

            {/* Info row */}
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-background/60 font-medium">
                {language === 'pt' ? `Estoque: ${product.quantity}` : `Stock: ${product.quantity}`}
              </span>

              {product.location && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {product.location}
                </span>
              )}

              {product.priority && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  product.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                  product.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {product.priority === 'high' ? (language === 'pt' ? 'Alta' : 'High') :
                   product.priority === 'medium' ? (language === 'pt' ? 'Média' : 'Medium') :
                   (language === 'pt' ? 'Baixa' : 'Low')}
                </span>
              )}
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map(tag => (
                  <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" displayName={getTranslatedName(tag)} onClick={() => navigate(`/tags/${tag.id}`)} />
                ))}
              </div>
            )}

            {/* Reference Link Embed */}
            {product.reference_url && (
              <div className="rounded-lg border border-border overflow-hidden">
                <a
                  href={product.reference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <LinkIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {language === 'pt' ? 'Link de Referência' : 'Reference Link'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(() => {
                        try { return new URL(product.reference_url).hostname; } catch { return product.reference_url; }
                      })()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {language === 'pt' ? 'Abrir ↗' : 'Open ↗'}
                  </span>
                </a>
                <div className="border-t border-border">
                  <iframe
                    src={product.reference_url}
                    title={language === 'pt' ? 'Prévia do produto' : 'Product preview'}
                    className="w-full h-48 border-0"
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {/* Interaction Bar */}
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/30">
              <FlagReportButton entityType="product" entityId={product.id} entityTitle={product.title} />
              <ShareItemButton itemId={product.id} itemTitle={product.title} itemType="product" size="sm" />
            </div>
          </div>

          {/* Content sections */}
          <div className="p-4 sm:p-6 space-y-5">

            {/* Action button (for non-owners) */}
            {!isOwner && !isDelivered && product.status !== 'unavailable' && product.quantity > 0 && remainingQuantity > 0 && (
              <Button
                className="w-full gap-2"
                onClick={() => setShowQuantityModal(true)}
              >
                {product.product_type === 'offer' ? <ShoppingCart className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                {product.product_type === 'offer'
                  ? (language === 'pt' ? 'Receber' : 'Receive')
                  : (language === 'pt' ? 'Fornecer' : 'Supply')}
              </Button>
            )}

            {/* Confirm delivery button - visible to requester, disabled without confirmed supplier */}
            {showDeliveryButton && (
              <Button
                className="w-full gap-2"
                variant="default"
                disabled={!hasConfirmedSupplier}
                onClick={() => setShowDeliveryModal(true)}
              >
                <CheckCircle className="w-4 h-4" />
                {language === 'pt' ? 'Confirmar Entrega' : 'Confirm Delivery'}
                {!hasConfirmedSupplier && (
                  <span className="text-xs opacity-70 ml-1">
                    ({language === 'pt' ? 'aguardando fornecedor' : 'waiting for supplier'})
                  </span>
                )}
              </Button>
            )}

            {/* Also show for offer creator who is also the supplier - let requester confirm */}
            {/* For request type: the creator is requester, show button */}
            {isOwner && product.product_type === 'request' && !isDelivered && (
              <Button
                className="w-full gap-2"
                variant="default"
                disabled={!hasSuppliers}
                onClick={() => setShowDeliveryModal(true)}
              >
                <CheckCircle className="w-4 h-4" />
                {language === 'pt' ? 'Confirmar Entrega' : 'Confirm Delivery'}
                {!hasSuppliers && (
                  <span className="text-xs opacity-70 ml-1">
                    ({language === 'pt' ? 'aguardando fornecedor' : 'waiting for supplier'})
                  </span>
                )}
              </Button>
            )}

            {/* Product Rating Section - after delivery */}
            {isDelivered && user && (
              <div className="rounded-xl bg-card border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <h4 className="font-semibold text-sm">{language === 'pt' ? 'Avaliações' : 'Ratings'}</h4>
                </div>
                
                {/* Show existing ratings */}
                {productRatings.length > 0 && (
                  <div className="space-y-2">
                    {productRatings.map(r => {
                      const raterProfile = participants.find(p => p.user_id === r.rater_user_id)?.profile;
                      const ratedProfile = participants.find(p => p.user_id === r.rated_user_id)?.profile;
                      return (
                        <div key={r.id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate">{raterProfile?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="truncate">{ratedProfile?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</span>
                          <StarRating rating={r.rating} size="sm" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rate participants */}
                {participants.filter(p => p.user_id !== user.id).map(p => {
                  const alreadyRated = productRatings.some(r => r.rater_user_id === user.id && r.rated_user_id === p.user_id);
                  if (alreadyRated) return null;
                  return (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar userId={p.user_id} name={p.profile?.full_name} avatarUrl={p.profile?.avatar_url} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{p.profile?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
                          <p className="text-xs text-muted-foreground">{p.role === 'supplier' ? (language === 'pt' ? 'Fornecedor' : 'Supplier') : (language === 'pt' ? 'Solicitador' : 'Requester')}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setRatingTarget({
                          userId: p.user_id,
                          userName: p.profile?.full_name || '',
                          avatarUrl: p.profile?.avatar_url || null,
                          role: p.role === 'supplier' ? 'collaborator' : 'requester',
                        })}
                      >
                        <Star className="w-3 h-3" />
                        {language === 'pt' ? 'Avaliar' : 'Rate'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Related Tasks Section */}
            {relatedTasks.length > 0 && (
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <Collapsible open={showRelatedTasks} onOpenChange={setShowRelatedTasks}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-medium hover:text-primary transition-colors">
                    <span className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      {language === 'pt' ? 'Tarefas Relacionadas' : 'Related Tasks'}
                      <span className="text-xs text-muted-foreground">({relatedTasks.length})</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRelatedTasks ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 px-4 pb-4">
                    {relatedTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => { onClose(); navigate(`/dashboard?task=${task.id}`); }}
                      >
                        <ListTodo className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              task.status === 'completed' ? 'bg-success/10 text-success' :
                              task.status === 'in_progress' ? 'bg-info/10 text-info' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {task.status === 'completed' ? (language === 'pt' ? 'Concluída' : 'Completed') :
                               task.status === 'in_progress' ? (language === 'pt' ? 'Em andamento' : 'In progress') :
                               (language === 'pt' ? 'Aberta' : 'Open')}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              task.task_type === 'offer' ? 'bg-success/10 text-success' :
                              task.task_type === 'request' ? 'bg-violet-500/10 text-violet-500' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {task.task_type === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') :
                               task.task_type === 'request' ? (language === 'pt' ? 'Solicitação' : 'Request') :
                               (language === 'pt' ? 'Pessoal' : 'Personal')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Participants section */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-medium hover:text-primary transition-colors text-left">
                  <span className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    {language === 'pt' ? 'Pessoas Envolvidas' : 'Participants'} ({nonCreatorParticipants.length + 1})
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 px-4 pb-4">
                  {/* Creator as first participant */}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 ring-1 ring-primary/10">
                    <div className="cursor-pointer" onClick={() => navigate(`/profile/${product.created_by}`)}>
                      <UserAvatar
                        userId={product.created_by}
                        name={product.creator?.full_name}
                        avatarUrl={product.creator?.avatar_url}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.creator?.full_name || (language === 'pt' ? 'Usuário' : 'User')}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          product.product_type === 'offer' ? 'bg-success/10 text-success' : 'bg-violet-500/10 text-violet-500'
                        }`}>
                          {product.product_type === 'offer'
                            ? (language === 'pt' ? 'Fornecedor' : 'Supplier')
                            : (language === 'pt' ? 'Solicitador' : 'Requester')}
                        </span>
                        <span className="text-xs text-muted-foreground opacity-70">
                          {language === 'pt' ? 'Criador' : 'Creator'}
                        </span>
                      </div>
                    </div>
                    {user?.id !== product.created_by && (
                      <StartChatButton userId={product.created_by} variant="ghost" size="icon" showLabel={false} />
                    )}
                  </div>

                  {/* Other participants */}
                  {nonCreatorParticipants.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="cursor-pointer" onClick={() => navigate(`/profile/${p.user_id}`)}>
                        <UserAvatar
                          userId={p.user_id}
                          name={p.profile?.full_name}
                          avatarUrl={p.profile?.avatar_url}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.profile?.full_name || '...'}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            p.role === 'supplier' ? 'bg-success/10 text-success' : 'bg-violet-500/10 text-violet-500'
                          }`}>
                            {p.role === 'supplier' ? (language === 'pt' ? 'Fornecedor' : 'Supplier') : (language === 'pt' ? 'Solicitador' : 'Requester')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {language === 'pt' ? `Qtd: ${p.quantity}` : `Qty: ${p.quantity}`}
                          </span>
                          {p.delivery_confirmed && (
                            <CheckCircle className="w-3 h-3 text-success" />
                          )}
                        </div>
                        {isOwner && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(p.created_at), language === 'pt' ? "dd/MM/yyyy 'às' HH:mm" : "MM/dd/yyyy 'at' HH:mm", { locale: dateLocale })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {user?.id !== p.user_id && (
                          <StartChatButton userId={p.user_id} variant="ghost" size="icon" showLabel={false} />
                        )}
                        {isOwner && !isDelivered && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{language === 'pt' ? 'Remover participante?' : 'Remove participant?'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {language === 'pt' 
                                    ? `O estoque será restaurado em ${p.quantity} unidade(s).`
                                    : `Stock will be restored by ${p.quantity} unit(s).`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{language === 'pt' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                  await handleRemoveParticipant(p.id, product.id);
                                }}>
                                  {language === 'pt' ? 'Remover' : 'Remove'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Comments Section */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <Collapsible open={showComments} onOpenChange={setShowComments}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-medium hover:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    {language === 'pt' ? 'Comentários' : 'Comments'}
                    <span className="text-xs text-muted-foreground">({comments.length})</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 px-4 pb-4">
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'pt' ? 'Nenhum comentário ainda' : 'No comments yet'}
                    </p>
                  )}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.map(comment => (
                      <ProductCommentItem key={comment.id} comment={comment} language={language} onDelete={() => handleDeleteComment(comment.id)} />
                    ))}
                  </div>
                  <div className="mt-3">
                    <CommentInput
                      onSend={handleAddComment}
                      placeholder={language === 'pt' ? 'Adicionar comentário...' : 'Add comment...'}
                      disabled={!user}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {participants.length >= 2 && (
              <Button variant="outline" className="w-full gap-2" onClick={handleStartGroupChat}>
                <MessageCircle className="w-4 h-4" />
                {language === 'pt' ? 'Chat do Produto' : 'Product Chat'}
              </Button>
            )}

            {/* Settings (owner only) */}
            {isOwner && (
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-sm font-semibold hover:text-primary transition-colors">
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {language === 'pt' ? 'Configurações' : 'Settings'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 px-4 pb-4">
                    {/* Collective use */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        <span className="text-sm">{language === 'pt' ? 'Uso coletivo' : 'Collective use'}</span>
                        <p className="text-xs text-muted-foreground">
                          {language === 'pt' ? 'Compartilhar no estoque das comunidades relacionadas' : 'Share in related community stock'}
                        </p>
                      </div>
                      <Switch checked={collectiveUse} onCheckedChange={handleToggleCollectiveUse} />
                    </div>

                    {/* Status - only show when collective use is enabled */}
                    {collectiveUse && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{language === 'pt' ? 'Status' : 'Status'}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={productStatus === 'available' ? 'default' : 'outline'}
                            className="text-xs h-7"
                            onClick={() => handleStatusChange('available')}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {language === 'pt' ? 'Disponível' : 'Available'}
                          </Button>
                          <Button
                            size="sm"
                            variant={productStatus === 'unavailable' ? 'default' : 'outline'}
                            className="text-xs h-7"
                            onClick={() => handleStatusChange('unavailable')}
                          >
                            <EyeOff className="w-3 h-3 mr-1" />
                            {language === 'pt' ? 'Indisponível' : 'Unavailable'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Delete button (owner only, outside settings) */}
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full gap-2">
                    <Trash2 className="w-4 h-4" />
                    {language === 'pt' ? 'Excluir Produto' : 'Delete Product'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{language === 'pt' ? 'Excluir produto?' : 'Delete product?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {language === 'pt' ? 'Esta ação não pode ser desfeita.' : 'This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{language === 'pt' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {language === 'pt' ? 'Excluir' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Modal */}
      {product && (
        <ProductQuantityModal
          open={showQuantityModal}
          onClose={() => setShowQuantityModal(false)}
          maxQuantity={remainingQuantity}
          onConfirm={async (qty) => {
            if (onParticipate) {
              await onParticipate(product.id, actionRole, qty);
            }
            setShowQuantityModal(false);
            fetchParticipants();
            onRefresh?.();
          }}
        />
      )}

      {/* Delivery Confirmation Modal - proof only (no code) */}
      <Dialog open={showDeliveryModal} onOpenChange={(isOpen) => !isOpen && setShowDeliveryModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Confirmar Entrega' : 'Confirm Delivery'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {language === 'pt'
                ? 'Confirme que recebeu o produto. Opcionalmente, envie uma prova.'
                : 'Confirm you received the product. Optionally, send proof.'}
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={proofMode === 'file' ? 'default' : 'outline'}
                className="flex-1 text-xs"
                onClick={() => setProofMode('file')}
              >
                <Upload className="w-3 h-3 mr-1" />
                {language === 'pt' ? 'Foto' : 'Photo'}
              </Button>
              <Button
                size="sm"
                variant={proofMode === 'link' ? 'default' : 'outline'}
                className="flex-1 text-xs"
                onClick={() => setProofMode('link')}
              >
                <LinkIcon className="w-3 h-3 mr-1" />
                Link
              </Button>
            </div>

            {proofMode === 'file' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                <Button variant="outline" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3 h-3 mr-1" />
                  {proofFile ? proofFile.name : (language === 'pt' ? 'Selecionar foto (opcional)' : 'Select photo (optional)')}
                </Button>
              </div>
            ) : (
              <Input
                placeholder={language === 'pt' ? 'Cole o link aqui (opcional)' : 'Paste link here (optional)'}
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            )}

            <Button
              className="w-full"
              disabled={confirming}
              onClick={handleConfirmDelivery}
            >
              {confirming && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <CheckCircle className="w-4 h-4 mr-1" />
              {language === 'pt' ? 'Confirmar Recebimento' : 'Confirm Receipt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {ratingTarget && (
        <RatingModal
          isOpen={!!ratingTarget}
          onClose={() => setRatingTarget(null)}
          onSubmit={handleSubmitProductRating}
          userName={ratingTarget.userName}
          userAvatar={ratingTarget.avatarUrl}
          userRole={ratingTarget.role}
          submitting={submittingRating}
        />
      )}
    </>
  );
}

// Product Comment Item Component
function ProductCommentItem({ comment, language, onDelete }: { comment: ProductComment; language: string; onDelete?: () => void }) {
  const { user } = useAuth();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [userLike, setUserLike] = useState<'like' | 'dislike' | null>(null);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const isOwner = user?.id === comment.user_id;

  useEffect(() => {
    fetchLikes();
  }, [comment.id]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from('product_comment_likes')
      .select('like_type, user_id')
      .eq('comment_id', comment.id);

    if (data) {
      setLikes(data.filter(d => d.like_type === 'like').length);
      setDislikes(data.filter(d => d.like_type === 'dislike').length);
      const myLike = data.find(d => d.user_id === user?.id);
      setUserLike(myLike ? (myLike.like_type as 'like' | 'dislike') : null);
    }
  };

  const handleLike = async (type: 'like' | 'dislike') => {
    if (!user) return;

    if (userLike === type) {
      await supabase.from('product_comment_likes').delete()
        .eq('comment_id', comment.id).eq('user_id', user.id);
      setUserLike(null);
      if (type === 'like') setLikes(l => Math.max(0, l - 1));
      else setDislikes(d => Math.max(0, d - 1));
    } else if (userLike) {
      await supabase.from('product_comment_likes').update({ like_type: type })
        .eq('comment_id', comment.id).eq('user_id', user.id);
      setUserLike(type);
      if (type === 'like') { setLikes(l => l + 1); setDislikes(d => Math.max(0, d - 1)); }
      else { setDislikes(d => d + 1); setLikes(l => Math.max(0, l - 1)); }
    } else {
      await supabase.from('product_comment_likes').insert({
        comment_id: comment.id, user_id: user.id, like_type: type
      });
      setUserLike(type);
      if (type === 'like') setLikes(l => l + 1);
      else setDislikes(d => d + 1);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: dateLocale
  });

  return (
    <div className="flex gap-3">
      <UserAvatar userId={comment.user_id} name={comment.profile?.full_name} avatarUrl={comment.profile?.avatar_url} size="sm" />
      <div className="flex-1 bg-muted rounded-lg p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium">{comment.profile?.full_name}</p>
            {comment.profile?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            {isOwner && onDelete && (
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {comment.attachment_url && (
          <div className="my-2">
            {comment.attachment_type === 'image' ? (
              <a href={comment.attachment_url} target="_blank" rel="noopener noreferrer">
                <img src={comment.attachment_url} alt="Anexo" className="max-w-full rounded-lg max-h-40 object-cover" />
              </a>
            ) : (
              <a href={comment.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-sm">
                <FileText className="h-4 w-4" />
                <span className="truncate">{comment.attachment_name || 'Anexo'}</span>
              </a>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{comment.content}</p>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => handleLike('like')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userLike === 'like' ? 'text-green-600' : 'text-muted-foreground hover:text-green-600'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${userLike === 'like' ? 'fill-current' : ''}`} />
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button
            onClick={() => handleLike('dislike')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userLike === 'dislike' ? 'text-red-600' : 'text-muted-foreground hover:text-red-600'
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${userLike === 'dislike' ? 'fill-current' : ''}`} />
            {dislikes > 0 && <span>{dislikes}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
