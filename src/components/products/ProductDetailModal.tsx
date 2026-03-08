import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Package, MapPin, User, MessageCircle, Send, CheckCircle, Loader2,
  Upload, Image, Link as LinkIcon, Settings, Trash2, ChevronDown,
  ShoppingCart, Truck, Eye, EyeOff, Users as UsersIcon, Pencil, Save
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TagBadge } from '@/components/ui/tag-badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { ProductQuantityModal } from './ProductQuantityModal';
import { Product, ProductParticipant, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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

  const isOwner = user?.id === product?.created_by;
  const isDelivered = product?.status === 'delivered';

  useEffect(() => {
    if (product && open) {
      fetchParticipants();
      setCollectiveUse(product.collective_use);
      setProductStatus(product.status === 'delivered' ? 'available' : product.status as 'available' | 'unavailable');
      setEditing(false);
      // Init edit fields
      setEditTitle(product.title);
      setEditDescription(product.description || '');
      setEditQuantity(product.quantity);
      setEditLocation(product.location || '');
      setEditPriority(product.priority || null);
    }
  }, [product, open]);

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

  // Participants excluding creator
  const nonCreatorParticipants = participants.filter(p => p.user_id !== product?.created_by);
  const hasSuppliers = participants.some(p => p.role === 'supplier' && p.user_id !== product?.created_by);
  const hasRequesters = participants.some(p => p.role === 'requester' && p.user_id !== product?.created_by);

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
          <div className="p-4 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
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

                <h2 className="text-xl font-display font-bold">{product.title}</h2>
              </div>
              {isOwner && !isDelivered && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (onEdit && product) {
                      onClose();
                      onEdit(product);
                    }
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${product.created_by}`)}>
              <UserAvatar userId={product.created_by} name={product.creator?.full_name} avatarUrl={product.creator?.avatar_url} size="lg" />
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
              <span className="px-3 py-1.5 rounded-lg bg-muted font-medium">
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

            {/* Action button (for non-owners) */}
            {!isOwner && !isDelivered && product.status !== 'unavailable' && product.quantity > 0 && (
              <Button
                className="w-full gap-2"
                onClick={() => setShowQuantityModal(true)}
              >
                {product.product_type === 'offer' ? <ShoppingCart className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                {product.product_type === 'offer'
                  ? (language === 'pt' ? 'Solicitar' : 'Request')
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

            {/* Participants section */}
            <Collapsible defaultOpen={nonCreatorParticipants.length > 0}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold hover:text-primary transition-colors">
                <span className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  {language === 'pt' ? 'Pessoas Envolvidas' : 'Participants'} ({nonCreatorParticipants.length})
                </span>
                <ChevronDown className="w-4 h-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {nonCreatorParticipants.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {language === 'pt' ? 'Nenhuma pessoa envolvida ainda' : 'No participants yet'}
                  </p>
                ) : (
                  nonCreatorParticipants.map(p => (
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
                        <div className="flex items-center gap-2">
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
                      </div>
                      {user?.id !== p.user_id && (
                        <StartChatButton userId={p.user_id} variant="ghost" size="icon" showLabel={false} />
                      )}
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Group chat button */}
            {participants.length >= 2 && (
              <Button variant="outline" className="w-full gap-2" onClick={handleStartGroupChat}>
                <MessageCircle className="w-4 h-4" />
                {language === 'pt' ? 'Chat do Produto' : 'Product Chat'}
              </Button>
            )}

            {/* Settings (owner only) */}
            {isOwner && (
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {language === 'pt' ? 'Configurações' : 'Settings'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3 px-1">
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

                  {/* Delete */}
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
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Modal */}
      {product && (
        <ProductQuantityModal
          open={showQuantityModal}
          onClose={() => setShowQuantityModal(false)}
          maxQuantity={product.quantity}
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
    </>
  );
}
