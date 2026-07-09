import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Image, X, Link as LinkIcon, CalendarIcon, FileText, Type, MapPin, Flag, Hash, ListChecks, Package, Settings, Gift, HandHeart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete';
import { FormField } from '@/components/ui/form/FormField';
import { InsertFieldMenu, InsertFieldOption } from '@/components/ui/form/InsertFieldMenu';
import { UnifiedTagField } from '@/components/ui/form/UnifiedTagField';
import { ModalHeader } from '@/components/ui/form/ModalHeader';
import { TypeSelector } from '@/components/ui/form/TypeSelector';
import { ImagePicker } from '@/components/ui/form/ImagePicker';
import { useTags } from '@/hooks/useTags';
import { useTagUsage } from '@/hooks/useTagUsage';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product, TagCategory } from '@/types';

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

type OptionalKey = 'image' | 'description' | 'quantity' | 'location' | 'date';

export function CreateProductModal({ open, onClose, onSubmit, taskId, editProduct, onUpdate, preSelectedTags }: CreateProductModalProps) {
  const { getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { sortTagsByUsage } = useTagUsage();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [productType, setProductType] = useState<'offer' | 'request'>('offer');
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
  const [activeFields, setActiveFields] = useState<OptionalKey[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editProduct;

  const resetForm = () => {
    setProductType('offer');
    setTitle('');
    setDescription('');
    setQuantity(1);
    setPriority(null);
    setProductLocation('');
    setSelectedTags([]);
    setImageFile(null);
    setImagePreview(null);
    setReferenceUrl('');
    setDeadline(undefined);
    setStartTime('');
    setEndTime('');
    setActiveFields([]);
  };

  useEffect(() => {
    if (editProduct && open) {
      setProductType(editProduct.product_type);
      setTitle(editProduct.title);
      setDescription(editProduct.description || '');
      setQuantity(editProduct.quantity);
      setPriority(editProduct.priority || null);
      setProductLocation(editProduct.location || '');
      setSelectedTags(editProduct.tags?.map(t => t.id) || []);
      if (editProduct.image_url) setImagePreview(editProduct.image_url);
      setReferenceUrl((editProduct as any).reference_url || '');
      const active: OptionalKey[] = [];
      if (editProduct.image_url) active.push('image');
      if (editProduct.description) active.push('description');
      if (editProduct.quantity && editProduct.quantity !== 1) active.push('quantity');
      if (editProduct.location) active.push('location');
      setActiveFields(active);
    } else if (open && preSelectedTags && preSelectedTags.length > 0) {
      resetForm();
      setSelectedTags(preSelectedTags);
    } else if (!open) {
      resetForm();
    }
  }, [editProduct, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: language === 'pt' ? 'Arquivo muito grande' : 'File too large', variant: 'destructive' });
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
    } catch { return undefined; } finally { setUploadingImage(false); }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleCreateTag = async (name: string, category: TagCategory) => {
    if (!name.trim()) return;
    const result = await createTag(name.trim(), category);
    if (result && 'id' in result) { toggleTag(result.id); refreshTags(); }
    else if (result && 'error' in result) toggleTag(result.existingTag.id);
  };

  const handleSuggestTags = async () => {
    setSuggesting(true);
    try {
      const pool = [...getTagsByCategory('physical_resources'), ...getTagsByCategory('communities')];
      const titleLower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let matched: string[] = [];
      if (titleLower) {
        matched = pool.filter(t => {
          const n = getTranslatedName(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return titleLower.includes(n) || n.split(' ').some(w => w.length > 3 && titleLower.includes(w));
        }).map(t => t.id);
      }
      if (matched.length === 0) matched = sortTagsByUsage(pool).slice(0, 5).map(t => t.id);
      const newIds = matched.filter(id => !selectedTags.includes(id)).slice(0, 3);
      if (newIds.length > 0) {
        setSelectedTags(prev => [...prev, ...newIds]);
        toast({ title: language === 'pt' ? `${newIds.length} tag(s) sugerida(s)` : `${newIds.length} suggested tag(s)` });
      } else {
        toast({ title: language === 'pt' ? 'Nenhuma sugestão nova' : 'No new suggestions' });
      }
    } finally { setSuggesting(false); }
  };

  const handleSubmit = async () => {
    if (!title.trim() || quantity < 1) return;
    setLoading(true);

    if (isEditing && editProduct && onUpdate) {
      let imageUrl = editProduct.image_url || undefined;
      if (imageFile) { const uploaded = await uploadImage(); if (uploaded) imageUrl = uploaded; }
      const success = await onUpdate(editProduct.id, {
        title: title.trim(),
        description: description.trim() || null,
        quantity, priority,
        location: productLocation || null,
        image_url: imageUrl || null,
        reference_url: referenceUrl.trim() || null,
      } as any, selectedTags);
      if (success) { toast({ title: language === 'pt' ? 'Produto atualizado!' : 'Product updated!' }); onClose(); }
      setLoading(false);
      return;
    }

    let imageUrl: string | undefined;
    if (imageFile) imageUrl = await uploadImage();
    const result = await onSubmit(title.trim(), description.trim(), productType, selectedTags, quantity, imageUrl, priority, productLocation || undefined, referenceUrl.trim() || undefined);
    if (result) {
      if (taskId && result.id) {
        try { await supabase.from('task_products').insert({ task_id: taskId, product_id: result.id }); } catch {}
      }
      toast({ title: language === 'pt' ? 'Produto criado!' : 'Product created!' });
      resetForm(); onClose();
    }
    setLoading(false);
  };

  const toggleField = (key: string) => {
    setActiveFields(prev => {
      const k = key as OptionalKey;
      if (prev.includes(k)) {
        if (k === 'location') setProductLocation('');
        if (k === 'date') { setDeadline(undefined); setStartTime(''); setEndTime(''); }
        if (k === 'quantity') setQuantity(1);
        if (k === 'image') { setImageFile(null); setImagePreview(null); }
        if (k === 'description') setDescription('');
        return prev.filter(x => x !== k);
      }
      return [...prev, k];
    });
  };

  const optionalFields: InsertFieldOption[] = [
    { key: 'image', label: language === 'pt' ? 'Imagem' : 'Image' },
    { key: 'description', label: language === 'pt' ? 'Descrição' : 'Description' },
    { key: 'quantity', label: language === 'pt' ? 'Quantidade' : 'Quantity' },
    { key: 'location', label: language === 'pt' ? 'Localização' : 'Location' },
    { key: 'date', label: language === 'pt' ? 'Data limite e horários' : 'Deadline & times' },
  ];

  const renderOptional = (k: OptionalKey) => {
    if (k === 'image') return (
      <FormField key={k} label={language === 'pt' ? 'Imagem' : 'Image'} icon={Image}>
        <ImagePicker preview={imagePreview} onFile={(f) => { setImageFile(f); const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); }} onClear={() => { setImageFile(null); setImagePreview(null); }} />
      </FormField>
    );
    if (k === 'description') return (
      <FormField key={k} label={language === 'pt' ? 'Descrição' : 'Description'} icon={FileText}>
        <RichTextEditor value={description} onChange={setDescription} placeholder={language === 'pt' ? 'Descreva o produto...' : 'Describe the product...'} maxLength={500} minHeight="80px" onUploadMedia={async (file) => {
          if (!user) return undefined;
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          const { data, error } = await supabase.storage.from('task-images').upload(fileName, file);
          if (error) return undefined;
          const { data: urlData } = supabase.storage.from('task-images').getPublicUrl(data.path);
          return urlData.publicUrl;
        }} />
      </FormField>
    );
    if (k === 'quantity') return (
      <FormField key={k} label={language === 'pt' ? 'Quantidade' : 'Quantity'} icon={Hash}>
        <Input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="clay-input" />
      </FormField>
    );
    if (k === 'location') return (
      <FormField key={k} label={language === 'pt' ? 'Localização' : 'Location'} icon={MapPin}>
        <LocationAutocomplete value={productLocation} onChange={setProductLocation} placeholder={language === 'pt' ? 'Cidade, Estado' : 'City, State'} />
      </FormField>
    );
    if (k === 'date') return (
      <FormField key={k} label={language === 'pt' ? 'Data limite e horários' : 'Deadline & times'} icon={CalendarIcon}>
        <div className="space-y-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal clay-input', !deadline && 'text-muted-foreground')}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {deadline ? format(deadline, 'PPP', { locale: dateLocale }) : (language === 'pt' ? 'Selecionar data' : 'Select date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[300]" align="start">
              <Calendar mode="single" selected={deadline} onSelect={(d) => { setDeadline(d); setCalendarOpen(false); }} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {deadline && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="clay-input" />
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="clay-input" />
            </div>
          )}
        </div>
      </FormField>
    );
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-background p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="sr-only">{isEditing ? (language === 'pt' ? 'Editar Produto' : 'Edit Product') : (language === 'pt' ? 'Criar Produto' : 'Create Product')}</DialogTitle>
          <ModalHeader
            icon={isEditing ? FileText : Package}
            title={isEditing ? (language === 'pt' ? 'Editar Produto' : 'Edit Product') : (language === 'pt' ? 'Criar Produto' : 'Create Product')}
            subtitle={language === 'pt' ? 'Descreva seu produto e ajuste os campos que precisar.' : 'Describe your product and add the fields you need.'}
            tone={isEditing ? 'blue' : 'amber'}
            actions={
              <Button type="button" variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="h-9 w-9 rounded-xl hover:bg-muted" title={language === 'pt' ? 'Configurações avançadas' : 'Advanced settings'}>
                <Settings className="w-4 h-4" />
              </Button>
            }
          />
        </DialogHeader>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 px-6 pb-6">
          <FormField label={language === 'pt' ? 'Tipo de Produto' : 'Product Type'} icon={ListChecks} required>
            <TypeSelector<'offer' | 'request'>
              value={productType}
              onChange={setProductType}
              columns={2}
              options={[
                { value: 'offer', label: language === 'pt' ? 'Oferta' : 'Offer', icon: Gift, tone: 'amber' },
                { value: 'request', label: language === 'pt' ? 'Solicitação' : 'Request', icon: HandHeart, tone: 'violet' },
              ]}
            />
          </FormField>

          <FormField label={language === 'pt' ? 'Nome do Produto' : 'Product Name'} icon={Type} required>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'pt' ? 'Nome do produto...' : 'Product name...'} maxLength={100} className="clay-input" />
          </FormField>


          <UnifiedTagField
            categories={['physical_resources', 'communities', 'skills']}
            selectedTagIds={selectedTags}
            onToggleTag={toggleTag}
            onCreateTag={handleCreateTag}
            onSuggest={handleSuggestTags}
            suggesting={suggesting}
          />

          {activeFields.map(renderOptional)}

          <InsertFieldMenu options={optionalFields} active={activeFields} onToggle={toggleField} />

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1 h-11 rounded-2xl">{language === 'pt' ? 'Cancelar' : 'Cancel'}</Button>
            <Button onClick={handleSubmit} className="flex-1 h-11 rounded-2xl bg-gradient-primary hover:opacity-90 font-semibold" disabled={loading || !title.trim() || quantity < 1 || uploadingImage}>
              {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditing ? (language === 'pt' ? 'Salvar Alterações' : 'Save Changes') : (language === 'pt' ? 'Criar Produto' : 'Create Product')}
            </Button>
          </div>
        </motion.div>
      </DialogContent>

      {/* Advanced Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {language === 'pt' ? 'Configurações avançadas' : 'Advanced settings'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label={language === 'pt' ? 'Prioridade' : 'Priority'} icon={Flag}>
              <Select value={priority || ''} onValueChange={(v) => setPriority(v || null)}>
                <SelectTrigger className="clay-input"><SelectValue placeholder={language === 'pt' ? 'Selecionar...' : 'Select...'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{language === 'pt' ? 'Baixa' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{language === 'pt' ? 'Média' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{language === 'pt' ? 'Alta' : 'High'}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={language === 'pt' ? 'Link de Referência' : 'Reference Link'} icon={LinkIcon}
              hint={language === 'pt' ? 'Link de loja online para referência de modelo/valor' : 'Online store link for reference'}>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} placeholder="https://..." className="pl-9 clay-input" type="url" />
              </div>
            </FormField>
          </div>
          <div className="flex justify-end pt-3">
            <Button onClick={() => setSettingsOpen(false)} className="rounded-xl">{language === 'pt' ? 'Concluir' : 'Done'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
