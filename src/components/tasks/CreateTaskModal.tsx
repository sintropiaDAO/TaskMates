import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, CalendarIcon, Image, X, CheckCircle, AlertTriangle, Settings, FileText, Type, MapPin, Flag, ListChecks, Gift, HandHeart, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete';
import { TaskSettingsPanel, TaskSettings, DEFAULT_TASK_SETTINGS } from '@/components/tasks/TaskSettingsPanel';
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
import { Task, TagCategory } from '@/types';


interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    taskType: 'offer' | 'request' | 'personal',
    tagIds: string[],
    deadline?: string,
    imageUrl?: string,
    priority?: 'low' | 'medium' | 'high' | null,
    location?: string,
    parentTaskId?: string
  ) => Promise<Task | null>;
  editTask?: Task | null;
  onComplete?: (taskId: string, proofUrl: string, proofType: string) => Promise<{ success: boolean; txHash: string | null }>;
  parentTaskId?: string;
  preSelectedTags?: string[];
}

type OptionalKey = 'image' | 'description' | 'location' | 'date' | 'priority';

export function CreateTaskModal({ open, onClose, onSubmit, editTask, onComplete, parentTaskId, preSelectedTags }: CreateTaskModalProps) {
  const { getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { sortTagsByUsage } = useTagUsage();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [taskType, setTaskType] = useState<'offer' | 'request' | 'personal'>('offer');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null);
  const [taskLocation, setTaskLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskSettings, setTaskSettings] = useState<TaskSettings>(DEFAULT_TASK_SETTINGS);
  const [activeFields, setActiveFields] = useState<OptionalKey[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMode, setProofMode] = useState<'link' | 'file'>('file');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  const [pendingTaskData, setPendingTaskData] = useState<any>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [suggestingTags, setSuggestingTags] = useState(false);

  useEffect(() => {
    if (editTask) {
      setTaskType(editTask.task_type);
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setDeadline(editTask.deadline?.split('T')[0] || '');
      setSelectedTags(editTask.tags?.map(t => t.id) || []);
      setPriority(editTask.priority || null);
      setTaskLocation((editTask as any).location || '');
      if (editTask.image_url) setImagePreview(editTask.image_url);
      const active: OptionalKey[] = [];
      if (editTask.image_url) active.push('image');
      if (editTask.description) active.push('description');
      if ((editTask as any).location) active.push('location');
      if (editTask.deadline) active.push('date');
      if (editTask.priority) active.push('priority');
      setActiveFields(active);
    } else if (preSelectedTags && preSelectedTags.length > 0) {
      resetForm();
      setSelectedTags(preSelectedTags);
    } else if (open) {
      resetForm();
    }
  }, [editTask, open]);

  const resetForm = () => {
    setTaskType('offer');
    setTitle('');
    setDescription('');
    setDeadline('');
    setStartTime('');
    setEndTime('');
    setPriority(null);
    setTaskLocation('');
    setSelectedTags([]);
    setImageFile(null);
    setImagePreview(null);
    setMarkAsCompleted(false);
    setShowCompletionModal(false);
    setProofUrl('');
    setProofFile(null);
    setProofMode('file');
    setCreatedTask(null);
    setPendingTaskData(null);
    setTaskSettings(DEFAULT_TASK_SETTINGS);
    setActiveFields([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t('taskFileTooLarge'), variant: 'destructive' });
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
      toast({ title: t('taskUploadError'), variant: 'destructive' });
      return undefined;
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleCreateTag = async (name: string, category: TagCategory) => {
    if (!name.trim()) return;
    const result = await createTag(name.trim(), category);
    if (result && 'error' in result) toggleTag(result.existingTag.id);
    else if (result && 'id' in result) { toggleTag(result.id); refreshTags(); }
  };

  const handleSuggestTags = async () => {
    setSuggestingTags(true);
    try {
      const skillTags = getTagsByCategory('skills');
      const titleLower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let matchedIds: string[] = [];
      if (titleLower) {
        matchedIds = skillTags.filter(tag => {
          const n = getTranslatedName(tag).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return titleLower.includes(n) || n.split(' ').some(w => w.length > 3 && titleLower.includes(w));
        }).map(t => t.id);
      }
      // fallback: top popular skills
      if (matchedIds.length === 0) {
        matchedIds = sortTagsByUsage(skillTags).slice(0, 5).map(t => t.id);
      }
      const newIds = matchedIds.filter(id => !selectedTags.includes(id)).slice(0, 3);
      if (newIds.length > 0) {
        setSelectedTags(prev => [...prev, ...newIds]);
        toast({ title: language === 'pt' ? `${newIds.length} tag(s) sugerida(s)` : `${newIds.length} suggested tag(s)` });
      } else {
        toast({ title: language === 'pt' ? 'Nenhuma sugestão nova' : 'No new suggestions' });
      }
    } finally { setSuggestingTags(false); }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    let imageUrl: string | undefined = editTask?.image_url || undefined;
    if (imageFile) imageUrl = await uploadImage();

    if (markAsCompleted && onComplete && !editTask) {
      setPendingTaskData({ title: title.trim(), description: description.trim(), taskType, tagIds: selectedTags, deadline: deadline || undefined, imageUrl, priority, location: taskLocation || undefined });
      setShowCompletionModal(true);
      setLoading(false);
      return;
    }

    const result = await onSubmit(title.trim(), description.trim(), taskType, selectedTags, deadline || undefined, imageUrl, priority, taskLocation || undefined, parentTaskId);
    if (result) { resetForm(); onClose(); }
    setLoading(false);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast({ title: t('taskFileTooLarge'), variant: 'destructive' }); return; }
      setProofFile(file);
    }
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    let finalProofUrl = proofUrl.trim();
    let proofType = 'link';
    if (proofMode === 'file' && proofFile) {
      setUploadingProof(true);
      try {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('task-proofs').upload(fileName, proofFile);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(data.path);
        finalProofUrl = urlData.publicUrl;
        proofType = proofFile.type.startsWith('image/') ? 'image' : proofFile.type.startsWith('video/') ? 'video' : proofFile.type.startsWith('audio/') ? 'audio' : 'pdf';
      } catch { toast({ title: t('taskUploadError'), variant: 'destructive' }); setUploadingProof(false); return; }
      setUploadingProof(false);
    }
    if (!finalProofUrl) { toast({ title: t('taskAddProof'), variant: 'destructive' }); return; }
    setCompleting(true);
    if (pendingTaskData) {
      const result = await onSubmit(pendingTaskData.title, pendingTaskData.description, pendingTaskData.taskType, pendingTaskData.tagIds, pendingTaskData.deadline, pendingTaskData.imageUrl, pendingTaskData.priority, pendingTaskData.location, parentTaskId);
      if (result) {
        const r = await onComplete(result.id, finalProofUrl, proofType);
        if (r.success) {
          toast({ title: t('taskCompletedSuccess'), description: r.txHash ? `${t('taskRegisteredBlockchain')} ${r.txHash.slice(0, 10)}...` : t('taskProofRegistered') });
          setShowCompletionModal(false); resetForm(); onClose();
        }
      }
      setCompleting(false); return;
    }
    if (createdTask) {
      const r = await onComplete(createdTask.id, finalProofUrl, proofType);
      if (r.success) { toast({ title: t('taskCompletedSuccess') }); setShowCompletionModal(false); resetForm(); onClose(); }
    }
    setCompleting(false);
  };

  const toggleField = (key: string) => {
    setActiveFields(prev => {
      const k = key as OptionalKey;
      if (prev.includes(k)) {
        if (k === 'date') { setDeadline(''); setStartTime(''); setEndTime(''); }
        if (k === 'location') setTaskLocation('');
        if (k === 'priority') setPriority(null);
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
    { key: 'location', label: language === 'pt' ? 'Localização' : 'Location' },
    { key: 'date', label: language === 'pt' ? 'Data e horários' : 'Date & times' },
    { key: 'priority', label: language === 'pt' ? 'Prioridade' : 'Priority' },
  ];

  const renderOptional = (k: OptionalKey) => {
    if (k === 'image') return (
      <FormField key={k} label={t('taskImage')} icon={Image}>
        <ImagePicker preview={imagePreview} onFile={(f) => { setImageFile(f); const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); }} onClear={() => { setImageFile(null); setImagePreview(null); }} />
      </FormField>
    );
    if (k === 'description') return (
      <FormField key={k} label={t('taskDescription')} icon={FileText}>
        <RichTextEditor value={description} onChange={setDescription} placeholder={t('taskDescriptionPlaceholder')} minHeight="100px" onUploadMedia={async (file) => {
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
    if (k === 'location') return (
      <FormField key={k} label={t('taskLocation')} icon={MapPin}>
        <LocationAutocomplete value={taskLocation} onChange={setTaskLocation} placeholder={t('taskLocationPlaceholder')} />
      </FormField>
    );
    if (k === 'date') return (
      <FormField key={k} label={language === 'pt' ? 'Data e horários' : 'Date & times'} icon={CalendarIcon}>
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal clay-input', !deadline && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{deadline ? format(new Date(deadline + 'T00:00:00'), 'PP', { locale: language === 'pt' ? ptBR : enUS }) : (language === 'pt' ? 'Selecionar data' : 'Select date')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[300]" align="start">
              <Calendar mode="single" selected={deadline ? new Date(deadline + 'T00:00:00') : undefined} onSelect={(d) => setDeadline(d ? format(d, 'yyyy-MM-dd') : '')} initialFocus className="p-3 pointer-events-auto" locale={language === 'pt' ? ptBR : enUS} />
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
    if (k === 'priority') return (
      <FormField key={k} label={t('taskPriority')} icon={Flag}>
        <Select value={priority || ''} onValueChange={(v) => setPriority((v as any) || null)}>
          <SelectTrigger className="clay-input"><SelectValue placeholder={t('taskPriority')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">{t('taskPriorityLow')}</SelectItem>
            <SelectItem value="medium">{t('taskPriorityMedium')}</SelectItem>
            <SelectItem value="high"><span className="flex items-center gap-1 text-orange-500"><AlertTriangle className="w-3 h-3" />{t('taskPriorityHigh')}</span></SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    );
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="!flex flex-col max-w-lg w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-background p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="sr-only">{editTask ? t('taskEditTitle') : t('taskCreateTitle')}</DialogTitle>
          <ModalHeader
            icon={editTask ? FileText : Plus}
            title={editTask ? t('taskEditTitle') : t('taskCreateTitle')}
            subtitle={language === 'pt' ? 'Preencha os campos essenciais e adicione mais conforme precisar.' : 'Fill in the essentials and add more as you need.'}
            tone={editTask ? 'blue' : 'primary'}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-9 w-9 rounded-xl hover:bg-muted"
                title={t('taskSettingsCollapsible')}
              >
                <Settings className="w-4 h-4" />
              </Button>
            }
          />
        </DialogHeader>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 px-6 pb-6">
          {/* Type — mandatory, top */}
          <FormField label={language === 'pt' ? 'Tipo de tarefa' : 'Task type'} icon={ListChecks} required>
            <TypeSelector<'offer' | 'request' | 'personal'>
              value={taskType}
              onChange={setTaskType}
              options={[
                { value: 'offer', label: t('taskOffer'), icon: Gift, tone: 'green' },
                { value: 'request', label: t('taskRequest'), icon: HandHeart, tone: 'pink' },
                { value: 'personal', label: t('taskPersonal'), icon: User, tone: 'blue' },
              ]}
            />
          </FormField>

          <FormField label={t('taskTitle')} icon={Type} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('taskTitlePlaceholder')} className="clay-input" />
          </FormField>


          <UnifiedTagField
            categories={['skills', 'communities', 'physical_resources']}
            selectedTagIds={selectedTags}
            onToggleTag={toggleTag}
            onCreateTag={handleCreateTag}
            onSuggest={handleSuggestTags}
            suggesting={suggestingTags}
          />

          {activeFields.map(renderOptional)}

          {!editTask && onComplete && (
            <FormField label={t('taskMarkAsCompleted')} icon={CheckCircle}>
              <div className="flex items-start gap-3">
                <Checkbox id="markAsCompleted" checked={markAsCompleted} onCheckedChange={(c) => setMarkAsCompleted(c === true)} />
                <label htmlFor="markAsCompleted" className="text-xs text-muted-foreground cursor-pointer">{t('taskMarkAsCompletedDescription')}</label>
              </div>
            </FormField>
          )}

          <InsertFieldMenu options={optionalFields} active={activeFields} onToggle={toggleField} />

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1 h-11 rounded-2xl">{t('cancel')}</Button>
            <Button onClick={handleSubmit} className="flex-1 h-11 rounded-2xl bg-gradient-primary hover:opacity-90 font-semibold" disabled={!title.trim() || loading || uploadingImage}>
              {(loading || uploadingImage) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editTask ? t('save') : t('taskCreate')}
            </Button>
          </div>
        </motion.div>
      </DialogContent>

      {/* Advanced Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="!flex flex-col max-w-md w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('taskSettingsCollapsible')}
            </DialogTitle>
          </DialogHeader>
          <TaskSettingsPanel settings={taskSettings} onChange={setTaskSettings} />
          <div className="flex justify-end pt-3">
            <Button onClick={() => setSettingsOpen(false)} className="rounded-xl">{language === 'pt' ? 'Concluir' : 'Done'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Proof Modal */}
      <Dialog open={showCompletionModal} onOpenChange={(isOpen) => !isOpen && setShowCompletionModal(false)}>
        <DialogContent className="!flex flex-col max-w-md w-[calc(100vw-1.5rem)] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{t('taskCompleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{t('taskCompleteDescription')}</p>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={proofMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setProofMode('file')} className="flex-1">{t('taskUploadFile')}</Button>
              <Button variant={proofMode === 'link' ? 'default' : 'outline'} size="sm" onClick={() => setProofMode('link')} className="flex-1">{t('taskExternalLink')}</Button>
            </div>
            {proofMode === 'link' ? (
              <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder={t('taskPasteLinkHere')} className="clay-input" />
            ) : (
              <div>
                <input ref={proofInputRef} type="file" accept="image/*,application/pdf,video/*,audio/*" onChange={handleProofFileChange} className="hidden" />
                <Button variant="outline" className="w-full clay-input" onClick={() => proofInputRef.current?.click()}>{proofFile ? t('taskFileSelected') : t('taskSelectFile')}</Button>
                {proofFile && <p className="text-sm text-muted-foreground mt-2">{proofFile.name}</p>}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowCompletionModal(false)} className="flex-1">{t('cancel')}</Button>
            <Button onClick={handleComplete} className="flex-1 bg-gradient-primary hover:opacity-90" disabled={completing || uploadingProof || (!proofUrl.trim() && !proofFile)}>
              {(completing || uploadingProof) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('taskConfirmCompletion')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
