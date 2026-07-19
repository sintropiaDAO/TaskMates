import { useState, useEffect, useRef } from 'react';
import { Plus, X, Loader2, CalendarIcon, Trash2, Image, Type, FileText, ListChecks, Users, Hash, BarChart3, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useTagUsage } from '@/hooks/useTagUsage';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form/FormField';
import { InsertFieldMenu, InsertFieldOption } from '@/components/ui/form/InsertFieldMenu';
import { UnifiedTagField } from '@/components/ui/form/UnifiedTagField';
import { ModalHeader } from '@/components/ui/form/ModalHeader';
import { ImagePicker } from '@/components/ui/form/ImagePicker';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Poll, TagCategory } from '@/types';
import { motion } from 'framer-motion';

interface EditablePollOption {
  id?: string;
  label: string;
  isNew?: boolean;
  votes?: number;
}

interface CreatePollModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    title: string, description: string, options: string[], tagIds: string[],
    deadline?: string, allowNewOptions?: boolean, taskId?: string,
    minQuorum?: number | null, imageUrl?: string
  ) => Promise<any>;
  onUpdate?: (
    pollId: string, title: string, description: string, tagIds: string[],
    deadline?: string, allowNewOptions?: boolean,
    minQuorum?: number | null, imageUrl?: string
  ) => Promise<any>;
  onDeleteOption?: (pollId: string, optionId: string, label: string) => Promise<boolean>;
  onAddOption?: (pollId: string, label: string) => Promise<any>;
  taskId?: string;
  editPoll?: Poll | null;
  preSelectedTags?: string[];
}

type OptionalKey = 'image' | 'description' | 'date';

export function CreatePollModal({
  open, onClose, onSubmit, onUpdate, onDeleteOption, onAddOption, taskId, editPoll, preSelectedTags
}: CreatePollModalProps) {
  const { getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { sortTagsByUsage } = useTagUsage();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [editableOptions, setEditableOptions] = useState<EditablePollOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [allowNewOptions, setAllowNewOptions] = useState(true);
  const [minQuorum, setMinQuorum] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startTimePoll, setStartTimePoll] = useState('');
  const [endTimePoll, setEndTimePoll] = useState('');
  const [activeFields, setActiveFields] = useState<OptionalKey[]>([]);
  const dateLocale = language === 'pt' ? ptBR : enUS;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editPoll;

  const resetForm = () => {
    setTitle(''); setDescription('');
    setOptions(['', '']); setEditableOptions([]); setNewOptionLabel('');
    setDeadline(undefined); setAllowNewOptions(true); setMinQuorum(null);
    setSelectedTags([]); setCalendarOpen(false); setStartTimePoll(''); setEndTimePoll('');
    setImageFile(null); setImagePreview(null);
    setActiveFields([]);
  };

  useEffect(() => {
    if (!open) { resetForm(); return; }
    if (editPoll) {
      setTitle(editPoll.title);
      setDescription(editPoll.description || '');
      setDeadline(editPoll.deadline ? new Date(editPoll.deadline) : undefined);
      setAllowNewOptions(editPoll.allow_new_options);
      setMinQuorum(editPoll.min_quorum || null);
      setSelectedTags(editPoll.tags?.map(t => t.id) || []);
      if ((editPoll as any).image_url) setImagePreview((editPoll as any).image_url);
      setEditableOptions(
        (editPoll.options || []).map(o => ({
          id: o.id, label: o.label,
          votes: (editPoll.votes || []).filter(v => v.option_id === o.id).length,
        }))
      );
      const active: OptionalKey[] = [];
      if ((editPoll as any).image_url) active.push('image');
      if (editPoll.description) active.push('description');
      if (editPoll.deadline) active.push('date');
      setActiveFields(active);
    } else if (preSelectedTags && preSelectedTags.length > 0) {
      setSelectedTags(preSelectedTags);
    }
  }, [open, editPoll?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
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
    } catch { toast({ title: language === 'pt' ? 'Erro ao enviar imagem' : 'Image upload error', variant: 'destructive' }); return undefined; }
    finally { setUploadingImage(false); }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const ensureTagSelected = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev : [...prev, tagId]);
  };

  const handleCreateTag = async (name: string, category: TagCategory) => {
    const result = await createTag(name.trim(), category);
    if (result && 'id' in result) {
      ensureTagSelected(result.id);
      await refreshTags();
      return result;
    }
    if (result && 'error' in result) {
      if (result.error === 'duplicate' && result.existingTag?.id) {
        ensureTagSelected(result.existingTag.id);
        return result.existingTag;
      }
      toast({
        title: language === 'pt' ? 'Erro ao criar tag' : 'Failed to create tag',
        description: (result as any).message || (language === 'pt' ? 'Tente novamente' : 'Please try again'),
        variant: 'destructive',
      });
      return result;
    }
    return result;
  };

  const addOption = () => { if (options.length < 10) setOptions([...options, '']); };
  const removeOption = (idx: number) => { if (options.length > 2) setOptions(options.filter((_, i) => i !== idx)); };
  const updateOption = (idx: number, val: string) => { const next = [...options]; next[idx] = val; setOptions(next); };

  const handleDeleteExistingOption = async (opt: EditablePollOption) => {
    if (!editPoll || !opt.id || !onDeleteOption) return;
    const ok = await onDeleteOption(editPoll.id, opt.id, opt.label);
    if (ok) { setEditableOptions(prev => prev.filter(o => o.id !== opt.id)); toast({ title: language === 'pt' ? 'Opção removida' : 'Option removed' }); }
  };

  const handleAddNewOption = async () => {
    if (!newOptionLabel.trim() || !editPoll || !onAddOption) return;
    const result = await onAddOption(editPoll.id, newOptionLabel.trim());
    if (result) {
      setEditableOptions(prev => [...prev, { id: result.id, label: result.label, votes: 0 }]);
      setNewOptionLabel('');
      toast({ title: language === 'pt' ? 'Opção adicionada' : 'Option added' });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    let imageUrl: string | undefined = (editPoll as any)?.image_url || undefined;
    if (imageFile) imageUrl = await uploadImage();
    else if (!imagePreview) imageUrl = undefined;

    if (isEditing && onUpdate && editPoll) {
      setLoading(true);
      const result = await onUpdate(editPoll.id, title.trim(), description.trim(), selectedTags, deadline?.toISOString(), allowNewOptions, minQuorum, imageUrl);
      if (result) { toast({ title: language === 'pt' ? 'Enquete atualizada!' : 'Poll updated!' }); onClose(); }
      setLoading(false); return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({ title: language === 'pt' ? 'Adicione pelo menos 2 opções' : 'Add at least 2 options', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await onSubmit(title.trim(), description.trim(), validOptions, selectedTags, deadline?.toISOString(), allowNewOptions, taskId, minQuorum, imageUrl);
    if (result) { toast({ title: language === 'pt' ? 'Enquete criada!' : 'Poll created!' }); onClose(); }
    setLoading(false);
  };

  const toggleField = (key: string) => {
    setActiveFields(prev => {
      const k = key as OptionalKey;
      if (prev.includes(k)) {
        if (k === 'date') { setDeadline(undefined); setStartTimePoll(''); setEndTimePoll(''); }
        if (k === 'image') { setImageFile(null); setImagePreview(null); }
        if (k === 'description') setDescription('');
        return prev.filter(x => x !== k);
      }
      return [...prev, k];
    });
  };

  const handleSuggestTags = async () => {
    setSuggesting(true);
    try {
      const pool = [...getTagsByCategory('skills'), ...getTagsByCategory('communities')];
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

  const optionalFields: InsertFieldOption[] = [
    { key: 'image', label: language === 'pt' ? 'Imagem' : 'Image' },
    { key: 'description', label: language === 'pt' ? 'Descrição' : 'Description' },
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
        <RichTextEditor value={description} onChange={setDescription} placeholder={language === 'pt' ? 'Contexto da enquete...' : 'Poll context...'} maxLength={500} minHeight="60px" onUploadMedia={async (file) => {
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
              <Input type="time" value={startTimePoll} onChange={e => setStartTimePoll(e.target.value)} className="clay-input" />
              <Input type="time" value={endTimePoll} onChange={e => setEndTimePoll(e.target.value)} className="clay-input" />
            </div>
          )}
        </div>
      </FormField>
    );
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="!flex flex-col max-w-lg sm:max-w-3xl lg:max-w-4xl w-[calc(100vw-1.5rem)] max-h-[90vh] sm:max-h-[88vh] overflow-y-auto overflow-x-hidden bg-background p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="sr-only">{isEditing ? (language === 'pt' ? 'Editar Enquete' : 'Edit Poll') : (language === 'pt' ? 'Criar Enquete' : 'Create Poll')}</DialogTitle>
          <ModalHeader
            icon={isEditing ? FileText : BarChart3}
            title={isEditing ? (language === 'pt' ? 'Editar Enquete' : 'Edit Poll') : (language === 'pt' ? 'Criar Enquete' : 'Create Poll')}
            subtitle={language === 'pt' ? 'Colete decisões da sua comunidade com opções de voto.' : 'Collect community decisions with voting options.'}
            tone={isEditing ? 'blue' : 'violet'}
            actions={
              <Button type="button" variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="h-9 w-9 rounded-xl hover:bg-muted" title={language === 'pt' ? 'Configurações avançadas' : 'Advanced settings'}>
                <Settings className="w-4 h-4" />
              </Button>
            }
          />
        </DialogHeader>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 px-6 pb-6">
          <FormField label={language === 'pt' ? 'Título' : 'Title'} icon={Type} required>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'pt' ? 'Título da enquete...' : 'Poll title...'} maxLength={200} className="clay-input" />
          </FormField>


          <UnifiedTagField
            categories={['skills', 'communities', 'physical_resources']}
            selectedTagIds={selectedTags}
            onToggleTag={toggleTag}
            onCreateTag={handleCreateTag}
            onSuggest={handleSuggestTags}
            suggesting={suggesting}
          />


          {/* Options — core to a poll, always visible */}
          <FormField label={language === 'pt' ? 'Opções de Voto' : 'Vote Options'} icon={ListChecks} required={!isEditing}>
            {!isEditing ? (
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={opt} onChange={e => updateOption(idx, e.target.value)} placeholder={`${language === 'pt' ? 'Opção' : 'Option'} ${idx + 1}`} maxLength={100} className="clay-input" />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    {language === 'pt' ? 'Adicionar opção' : 'Add option'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {editableOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                    <span className="flex-1 text-sm">{opt.label}</span>
                    <span className="text-xs text-muted-foreground px-1.5">{opt.votes} {language === 'pt' ? 'voto(s)' : 'vote(s)'}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDeleteExistingOption(opt)} disabled={editableOptions.length <= 2}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {editableOptions.length < 10 && (
                  <div className="flex items-center gap-2">
                    <Input value={newOptionLabel} onChange={e => setNewOptionLabel(e.target.value)} placeholder={language === 'pt' ? 'Nova opção...' : 'New option...'} maxLength={100} className="h-8 text-sm clay-input" onKeyDown={e => e.key === 'Enter' && handleAddNewOption()} />
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleAddNewOption} disabled={!newOptionLabel.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </FormField>

          {activeFields.map(renderOptional)}

          <InsertFieldMenu options={optionalFields} active={activeFields} onToggle={toggleField} />

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-2xl">{language === 'pt' ? 'Cancelar' : 'Cancel'}</Button>
            <Button onClick={handleSubmit} disabled={loading || !title.trim() || uploadingImage} className="flex-1 h-11 rounded-2xl bg-gradient-primary hover:opacity-90 font-semibold">
              {(loading || uploadingImage) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditing ? (language === 'pt' ? 'Salvar Alterações' : 'Save Changes') : (language === 'pt' ? 'Criar Enquete' : 'Create Poll')}
            </Button>
          </div>
        </motion.div>
      </DialogContent>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="!flex flex-col max-w-md w-[calc(100vw-1.5rem)] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {language === 'pt' ? 'Configurações avançadas' : 'Advanced settings'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label={language === 'pt' ? 'Permitir novas opções' : 'Allow new options'} icon={Users}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{language === 'pt' ? 'Votantes podem sugerir novas opções' : 'Voters can suggest new options'}</span>
                <Switch checked={allowNewOptions} onCheckedChange={setAllowNewOptions} />
              </div>
            </FormField>
            <FormField label={language === 'pt' ? 'Quórum mínimo' : 'Minimum quorum'} icon={Hash}
              hint={language === 'pt' ? 'Número mínimo de votantes necessários.' : 'Minimum number of voters required.'}>
              <Input type="number" min={0} max={999} value={minQuorum ?? ''}
                onChange={e => { const v = e.target.value; setMinQuorum(v ? parseInt(v) : null); }}
                placeholder={language === 'pt' ? 'Ex: 5' : 'E.g.: 5'} className="w-32 clay-input" />
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

