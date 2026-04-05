import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Image, X, Link as LinkIcon, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagBadge } from '@/components/ui/tag-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartTagSelector } from '@/components/tags/SmartTagSelector';
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    productType: 'offer' | 'request',
    tagIds: string[],
    quantity: number,
    imageUrl?: string,
    priority?: string | null,
    location?: string,
    referenceUrl?: string
  ) => Promise<any>;
  taskId?: string;
  editProduct?: Product | null;
  onUpdate?: (productId: string, updates: Partial<Product>, tagIds: string[]) => Promise<boolean>;
  preSelectedTags?: string[];
}

export function CreateProductModal({ open, onClose, onSubmit, taskId, editProduct, onUpdate, preSelectedTags }: CreateProductModalProps) {
  const { getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [productType, setProductType] = useState<'offer' | 'request' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<string | null>(null);
  const [productLocation, setProductLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editProduct;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: language === 'pt' ? 'Arquivo muito grande (máx 5MB)' : 'File too large (max 5MB)', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile || !user) return undefined;
    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('task-images').upload(fileName, imageFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('task-images').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return undefined;
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setProductType(null);
    setTitle('');
    setDescription('');
    setQuantity(1);
    setPriority(null);
    setProductLocation('');
    setSelectedTags([]);
    setImageFile(null);
    setImagePreview(null);
    setReferenceUrl('');
  };

  // Initialize form when editProduct changes or modal opens
  useEffect(() => {
    if (editProduct && open) {
      setProductType(editProduct.product_type);
      setTitle(editProduct.title);
      setDescription(editProduct.description || '');
      setQuantity(editProduct.quantity);
      setPriority(editProduct.priority || null);
      setProductLocation(editProduct.location || '');
      setSelectedTags(editProduct.tags?.map(t => t.id) || []);
      if (editProduct.image_url) {
        setImagePreview(editProduct.image_url);
      }
      setReferenceUrl((editProduct as any).reference_url || '');
    } else if (open && preSelectedTags && preSelectedTags.length > 0) {
      resetForm();
      setSelectedTags(preSelectedTags);
    } else if (!open) {
      resetForm();
    }
  }, [editProduct, open]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleCreateResource = async (name: string) => {
    const result = await createTag(name.trim(), 'physical_resources');
    if (result && 'id' in result) {
      toggleTag(result.id);
      refreshTags();
    } else if (result && 'error' in result) {
      toggleTag(result.existingTag.id);
    }
  };

  const handleCreateCommunity = async (name: string) => {
    const result = await createTag(name.trim(), 'communities');
    if (result && 'id' in result) {
      toggleTag(result.id);
      refreshTags();
    } else if (result && 'error' in result) {
      toggleTag(result.existingTag.id);
    }
  };

  const handleSubmit = async () => {
    if (!productType || !title.trim() || quantity < 1) return;
    setLoading(true);

    // Handle edit mode
    if (isEditing && editProduct && onUpdate) {
      let imageUrl = editProduct.image_url || undefined;
      if (imageFile) {
        const uploaded = await uploadImage();
        if (uploaded) imageUrl = uploaded;
      }

      const success = await onUpdate(editProduct.id, {
        title: title.trim(),
        description: description.trim() || null,
        quantity,
        priority,
        location: productLocation || null,
        image_url: imageUrl || null,
        reference_url: referenceUrl.trim() || null,
      } as any, selectedTags);

      if (success) {
        toast({ title: language === 'pt' ? 'Produto atualizado!' : 'Product updated!' });
        onClose();
      }
      setLoading(false);
      return;
    }

    // Handle create mode
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await uploadImage();
    }

    const result = await onSubmit(
      title.trim(),
      description.trim(),
      productType,
      selectedTags,
      quantity,
      imageUrl,
      priority,
      productLocation || undefined,
      referenceUrl.trim() || undefined
    );

    if (result) {
      if (taskId && result.id) {
        try {
          await supabase
            .from('task_products')
            .insert({ task_id: taskId, product_id: result.id });
        } catch (error) {
          console.error('Error linking product to task:', error);
        }
      }

      toast({ title: language === 'pt' ? 'Produto criado!' : 'Product created!' });
      resetForm();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? (language === 'pt' ? 'Editar Produto' : 'Edit Product')
              : (language === 'pt' ? 'Criar Produto' : 'Create Product')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!productType && !isEditing && (
            <div className="space-y-3">
              <Label>{language === 'pt' ? 'Tipo de Produto' : 'Product Type'}</Label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setProductType('offer')}
                  className="p-4 rounded-xl border-2 border-amber-500/20 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                    <Plus className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{language === 'pt' ? 'Oferta' : 'Offer'}</h3>
                  <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Você oferece um produto' : 'You offer a product'}</p>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setProductType('request')}
                  className="p-4 rounded-xl border-2 border-violet-500/20 hover:border-violet-500 hover:bg-violet-500/5 transition-all text-center">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-2">
                    <Plus className="w-5 h-5 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{language === 'pt' ? 'Solicitação' : 'Request'}</h3>
                  <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Você precisa de um produto' : 'You need a product'}</p>
                </motion.button>
              </div>
            </div>
          )}

          {productType && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  productType === 'offer' ? 'bg-amber-500/10 text-amber-500' : 'bg-violet-500/10 text-violet-500'
                }`}>
                  {productType === 'offer' ? (language === 'pt' ? 'Oferta' : 'Offer') : (language === 'pt' ? 'Solicitação' : 'Request')}
                </span>
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => setProductType(null)}>
                    {language === 'pt' ? 'Alterar' : 'Change'}
                  </Button>
                )}
              </div>

              <div>
                <Label>{language === 'pt' ? 'Nome do Produto' : 'Product Name'}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'pt' ? 'Nome do produto...' : 'Product name...'} maxLength={100} />
              </div>

              <div>
                <Label>{language === 'pt' ? 'Descrição' : 'Description'}</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder={language === 'pt' ? 'Descreva o produto...' : 'Describe the product...'} maxLength={500} minHeight="80px" />
              </div>

              <div>
                <Label>{language === 'pt' ? 'Quantidade' : 'Quantity'}</Label>
                <Input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>

              <div>
                <Label>{language === 'pt' ? 'Prioridade' : 'Priority'}</Label>
                <Select value={priority || ''} onValueChange={(v) => setPriority(v || null)}>
                  <SelectTrigger><SelectValue placeholder={language === 'pt' ? 'Selecionar...' : 'Select...'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{language === 'pt' ? 'Baixa' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{language === 'pt' ? 'Média' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{language === 'pt' ? 'Alta' : 'High'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{language === 'pt' ? 'Localização' : 'Location'}</Label>
                <LocationAutocomplete value={productLocation} onChange={setProductLocation} placeholder={language === 'pt' ? 'Cidade, Estado' : 'City, State'} />
              </div>

              {/* Image */}
              <div>
                <Label>{language === 'pt' ? 'Imagem' : 'Image'}</Label>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {imagePreview ? (
                  <div className="relative mt-2">
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full mt-1" onClick={() => imageInputRef.current?.click()}>
                    <Image className="w-4 h-4 mr-2" />
                    {language === 'pt' ? 'Adicionar imagem' : 'Add image'}
                  </Button>
                )}
              </div>

              {/* Reference Link */}
              <div>
                <Label>{language === 'pt' ? 'Link de Referência' : 'Reference Link'}</Label>
                <div className="relative mt-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={referenceUrl}
                    onChange={e => setReferenceUrl(e.target.value)}
                    placeholder={language === 'pt' ? 'https://loja.com/produto...' : 'https://store.com/product...'}
                    className="pl-9"
                    type="url"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'pt' ? 'Link de loja online para referência de modelo/valor' : 'Online store link for model/price reference'}
                </p>
              </div>


              <div className="space-y-3 p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                {/* Resources */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{language === 'pt' ? 'Tags de Recursos' : 'Resource Tags'}</Label>
                  
                  {selectedTags.filter(id => getTagsByCategory('physical_resources').some(t => t.id === id)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {getTagsByCategory('physical_resources')
                        .filter(tag => selectedTags.includes(tag.id))
                        .map(tag => (
                          <TagBadge 
                            key={tag.id} 
                            name={tag.name} 
                            category="physical_resources" 
                            displayName={getTranslatedName(tag)} 
                            selected
                            onRemove={() => toggleTag(tag.id)}
                          />
                        ))}
                    </div>
                  )}
                  
                  <SmartTagSelector
                    category="physical_resources"
                    selectedTagIds={selectedTags}
                    onToggleTag={toggleTag}
                    onCreateTag={handleCreateResource}
                    excludeTagIds={selectedTags}
                  />
                </div>

                {/* Communities */}
                <div className="space-y-2 pt-2 border-t border-primary/10">
                  <Label>{language === 'pt' ? 'Tags de Comunidades' : 'Community Tags'}</Label>
                  
                  {selectedTags.filter(id => getTagsByCategory('communities').some(t => t.id === id)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {getTagsByCategory('communities')
                        .filter(tag => selectedTags.includes(tag.id))
                        .map(tag => (
                          <TagBadge 
                            key={tag.id} 
                            name={tag.name} 
                            category="communities" 
                            displayName={getTranslatedName(tag)} 
                            selected
                            onRemove={() => toggleTag(tag.id)}
                          />
                        ))}
                    </div>
                  )}
                  
                  <SmartTagSelector
                    category="communities"
                    selectedTagIds={selectedTags}
                    onToggleTag={toggleTag}
                    onCreateTag={handleCreateCommunity}
                    excludeTagIds={selectedTags}
                  />
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={loading || !title.trim() || quantity < 1} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEditing
                  ? (language === 'pt' ? 'Salvar Alterações' : 'Save Changes')
                  : (language === 'pt' ? 'Criar Produto' : 'Create Product')}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
