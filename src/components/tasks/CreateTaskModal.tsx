import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Calendar, Image, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartTagSelector } from '@/components/tags/SmartTagSelector';
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';

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
    location?: string
  ) => Promise<Task | null>;
  editTask?: Task | null;
  onComplete?: (taskId: string, proofUrl: string, proofType: string) => Promise<{ success: boolean; txHash: string | null }>;
}

export function CreateTaskModal({ open, onClose, onSubmit, editTask, onComplete }: CreateTaskModalProps) {
  const { getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [taskType, setTaskType] = useState<'offer' | 'request' | 'personal' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null);
  const [taskLocation, setTaskLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Completion state
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMode, setProofMode] = useState<'link' | 'file'>('file');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when editTask changes
  useEffect(() => {
    if (editTask) {
      setTaskType(editTask.task_type);
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setDeadline(editTask.deadline?.split('T')[0] || '');
      setSelectedTags(editTask.tags?.map(t => t.id) || []);
      setPriority(editTask.priority || null);
      setTaskLocation((editTask as any).location || '');
      if (editTask.image_url) {
        setImagePreview(editTask.image_url);
      }
    } else {
      resetForm();
    }
  }, [editTask, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({ title: t('taskInvalidFileType'), variant: 'destructive' });
        return;
      }
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
      console.error('Image upload error:', error);
      toast({ title: t('taskUploadError'), variant: 'destructive' });
      return undefined;
    } finally {
      setUploadingImage(false);
    }
  };

  // Store pending task data for when completion is checked
  const [pendingTaskData, setPendingTaskData] = useState<{
    title: string;
    description: string;
    taskType: 'offer' | 'request' | 'personal';
    tagIds: string[];
    deadline?: string;
    imageUrl?: string;
    priority?: 'low' | 'medium' | 'high' | null;
    location?: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!taskType || !title.trim()) return;
    setLoading(true);
    
    let imageUrl: string | undefined = editTask?.image_url || undefined;
    if (imageFile) {
      imageUrl = await uploadImage();
    }
    
    // If marked as completed, store data and show completion modal first
    if (markAsCompleted && onComplete && !editTask) {
      setPendingTaskData({
        title: title.trim(),
        description: description.trim(),
        taskType,
        tagIds: selectedTags,
        deadline: deadline || undefined,
        imageUrl,
        priority,
        location: taskLocation || undefined
      });
      setShowCompletionModal(true);
      setLoading(false);
      return;
    }
    
    const result = await onSubmit(title.trim(), description.trim(), taskType, selectedTags, deadline || undefined, imageUrl, priority, taskLocation || undefined);
    
    if (result) {
      resetForm();
      onClose();
    }
    setLoading(false);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({ title: t('taskInvalidFileType'), variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('taskFileTooLarge'), variant: 'destructive' });
        return;
      }
      setProofFile(file);
    }
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    
    let finalProofUrl = proofUrl.trim();
    let proofType = 'link';

    // Upload proof file if selected
    if (proofMode === 'file' && proofFile) {
      setUploadingProof(true);
      try {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('task-proofs').upload(fileName, proofFile);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(data.path);
        finalProofUrl = urlData.publicUrl;
        proofType = proofFile.type.startsWith('image/') ? 'image' : 'pdf';
      } catch (error) {
        console.error('Upload error:', error);
        toast({ title: t('taskUploadError'), variant: 'destructive' });
        setUploadingProof(false);
        return;
      }
      setUploadingProof(false);
    }

    if (!finalProofUrl) {
      toast({ title: t('taskAddProof'), variant: 'destructive' });
      return;
    }

    setCompleting(true);

    // If we have pending task data, create the task first
    if (pendingTaskData) {
      const result = await onSubmit(
        pendingTaskData.title,
        pendingTaskData.description,
        pendingTaskData.taskType,
        pendingTaskData.tagIds,
        pendingTaskData.deadline,
        pendingTaskData.imageUrl,
        pendingTaskData.priority,
        pendingTaskData.location
      );
      
      if (result) {
        const completeResult = await onComplete(result.id, finalProofUrl, proofType);
        if (completeResult.success) {
          toast({
            title: t('taskCompletedSuccess'),
            description: completeResult.txHash ? `${t('taskRegisteredBlockchain')} ${completeResult.txHash.slice(0, 10)}...` : t('taskProofRegistered')
          });
          setShowCompletionModal(false);
          resetForm();
          onClose();
        }
      }
      setCompleting(false);
      return;
    }

    // For existing task completion flow
    if (createdTask) {
      const result = await onComplete(createdTask.id, finalProofUrl, proofType);
      if (result.success) {
        toast({
          title: t('taskCompletedSuccess'),
          description: result.txHash ? `${t('taskRegisteredBlockchain')} ${result.txHash.slice(0, 10)}...` : t('taskProofRegistered')
        });
        setShowCompletionModal(false);
        resetForm();
        onClose();
      }
    }
    setCompleting(false);
  };

  const resetForm = () => {
    setTaskType(null);
    setTitle('');
    setDescription('');
    setDeadline('');
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
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleCreateSkill = async (name: string) => {
    if (!name.trim()) return;
    const result = await createTag(name.trim(), 'skills');
    if (result && 'error' in result) {
      toggleTag(result.existingTag.id);
      toast({ title: t('profileTagAdded') });
    } else if (result && 'id' in result) {
      toggleTag(result.id);
      toast({ title: t('tagsSkillCreated') });
      refreshTags();
    }
  };

  const handleCreateCommunity = async (name: string) => {
    if (!name.trim()) return;
    const result = await createTag(name.trim(), 'communities');
    if (result && 'error' in result) {
      toggleTag(result.existingTag.id);
      toast({ title: t('profileTagAdded') });
    } else if (result && 'id' in result) {
      toggleTag(result.id);
      toast({ title: t('tagsCommunityCreated') });
      refreshTags();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTask ? t('taskEditTitle') : t('taskCreateTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!taskType && (
            <div className="space-y-3">
              <Label>{t('taskTypeLabel')}</Label>
              <div className="grid grid-cols-3 gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTaskType('offer')} className="p-4 rounded-xl border-2 border-success/20 hover:border-success hover:bg-success/5 transition-all text-center">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                    <Plus className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('taskOffer')}</h3>
                  <p className="text-xs text-muted-foreground">{t('taskYouOfferSomething')}</p>
                </motion.button>
                
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTaskType('request')} className="p-4 rounded-xl border-2 border-pink-600/20 hover:border-pink-600 hover:bg-pink-600/5 transition-all text-center">
                  <div className="w-10 h-10 rounded-full bg-pink-600/10 flex items-center justify-center mx-auto mb-2">
                    <Plus className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('taskRequest')}</h3>
                  <p className="text-xs text-muted-foreground">{t('taskYouNeedHelp')}</p>
                </motion.button>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTaskType('personal')} className="p-4 rounded-xl border-2 border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <Plus className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('taskPersonal')}</h3>
                  <p className="text-xs text-muted-foreground">{t('taskPersonalNote')}</p>
                </motion.button>
              </div>
            </div>
          )}

          {(taskType || editTask) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  taskType === 'offer' ? 'bg-success/10 text-success' : 
                  taskType === 'request' ? 'bg-pink-600/10 text-pink-600' : 
                  'bg-blue-500/10 text-blue-500'
                }`}>
                  {taskType === 'offer' ? t('taskOffer') : taskType === 'request' ? t('taskRequest') : t('taskPersonal')}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setTaskType(null)}>{t('taskChangeType')}</Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{t('taskTitle')} *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('taskTitlePlaceholder')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('taskDescription')}</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('taskDescriptionPlaceholder')} className="min-h-[100px]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">{t('taskDeadlineOptional')}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="pl-10" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">{t('taskPriorityOptional')}</Label>
                  <Select value={priority || ''} onValueChange={(val) => setPriority(val as 'low' | 'medium' | 'high' | null || null)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('taskPriority')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('taskPriorityLow')}</SelectItem>
                      <SelectItem value="medium">{t('taskPriorityMedium')}</SelectItem>
                      <SelectItem value="high">
                        <span className="flex items-center gap-1 text-orange-500">
                          <AlertTriangle className="w-3 h-3" />
                          {t('taskPriorityHigh')}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('taskLocation')}</Label>
                <LocationAutocomplete
                  value={taskLocation}
                  onChange={setTaskLocation}
                  placeholder={t('taskLocationPlaceholder')}
                />
              </div>

              {/* Skills Section */}
              <div className="space-y-2">
                <Label>{t('taskRelatedSkills')}</Label>
                
                {/* Selected skill tags */}
                {selectedTags.filter(id => getTagsByCategory('skills').some(t => t.id === id)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {getTagsByCategory('skills')
                      .filter(tag => selectedTags.includes(tag.id))
                      .map(tag => (
                        <TagBadge 
                          key={tag.id} 
                          name={tag.name} 
                          category="skills" 
                          displayName={getTranslatedName(tag)} 
                          selected
                          onRemove={() => toggleTag(tag.id)}
                        />
                      ))}
                  </div>
                )}
                
                <SmartTagSelector
                  category="skills"
                  selectedTagIds={selectedTags}
                  onToggleTag={toggleTag}
                  onCreateTag={handleCreateSkill}
                  maxVisibleTags={10}
                  excludeTagIds={selectedTags}
                />
              </div>

              {/* Communities Section */}
              <div className="space-y-2">
                <Label>{t('taskCommunities')}</Label>
                
                {/* Selected community tags */}
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
                  maxVisibleTags={10}
                  excludeTagIds={selectedTags}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>{t('taskImageOptional')}</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    {t('taskSelectImage')}
                  </Button>
                )}
              </div>

              {/* Mark as completed checkbox - only for new tasks */}
              {!editTask && onComplete && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="markAsCompleted"
                      checked={markAsCompleted}
                      onCheckedChange={(checked) => setMarkAsCompleted(checked === true)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="markAsCompleted"
                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-success" />
                        {t('taskMarkAsCompleted')}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('taskMarkAsCompletedDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1">{t('cancel')}</Button>
                <Button onClick={handleSubmit} className="flex-1 bg-gradient-primary hover:opacity-90" disabled={!title.trim() || loading || uploadingImage}>
                  {(loading || uploadingImage) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editTask ? t('save') : t('taskCreate')}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>

      {/* Completion Proof Modal */}
      <Dialog open={showCompletionModal} onOpenChange={(isOpen) => !isOpen && setShowCompletionModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('taskCompleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{t('taskCompleteDescription')}</p>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={proofMode === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofMode('file')}
                className="flex-1"
              >
                {t('taskUploadFile')}
              </Button>
              <Button
                variant={proofMode === 'link' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProofMode('link')}
                className="flex-1"
              >
                {t('taskExternalLink')}
              </Button>
            </div>

            {proofMode === 'link' ? (
              <Input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder={t('taskPasteLinkHere')}
              />
            ) : (
              <div>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleProofFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => proofInputRef.current?.click()}
                >
                  {proofFile ? t('taskFileSelected') : t('taskSelectFile')}
                </Button>
                {proofFile && (
                  <p className="text-sm text-muted-foreground mt-2">{proofFile.name}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowCompletionModal(false)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleComplete}
              className="flex-1 bg-gradient-primary hover:opacity-90"
              disabled={completing || uploadingProof || (!proofUrl.trim() && !proofFile)}
            >
              {(completing || uploadingProof) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('taskConfirmCompletion')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
