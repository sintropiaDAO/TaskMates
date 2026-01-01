import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TagInputWithSuggestions } from '@/components/tags/TagInputWithSuggestions';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Task, Tag } from '@/types';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    taskType: 'offer' | 'request' | 'personal',
    tagIds: string[],
    deadline?: string
  ) => Promise<Task | null>;
  editTask?: Task | null;
}

export function CreateTaskModal({ open, onClose, onSubmit, editTask }: CreateTaskModalProps) {
  const { tags, getTagsByCategory, createTag, refreshTags, getTranslatedName } = useTags();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [taskType, setTaskType] = useState<'offer' | 'request' | 'personal' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [addingCommunity, setAddingCommunity] = useState(false);

  // Initialize form when editTask changes
  useEffect(() => {
    if (editTask) {
      setTaskType(editTask.task_type);
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setDeadline(editTask.deadline?.split('T')[0] || '');
      setSelectedTags(editTask.tags?.map(t => t.id) || []);
    } else {
      resetForm();
    }
  }, [editTask, open]);

  const handleSubmit = async () => {
    if (!taskType || !title.trim()) return;
    setLoading(true);
    
    const result = await onSubmit(title.trim(), description.trim(), taskType, selectedTags, deadline || undefined);
    
    if (result) {
      resetForm();
      onClose();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTaskType(null);
    setTitle('');
    setDescription('');
    setDeadline('');
    setSelectedTags([]);
    setNewSkillName('');
    setNewCommunityName('');
    setAddingSkill(false);
    setAddingCommunity(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) return;
    const result = await createTag(newSkillName.trim(), 'skills');
    if (result && 'error' in result) {
      // Tag already exists, select it
      toggleTag(result.existingTag.id);
      toast({ title: t('profileTagAdded') });
    } else if (result && 'id' in result) {
      toggleTag(result.id);
      toast({ title: t('tagsSkillCreated') });
      refreshTags();
    }
    setNewSkillName('');
    setAddingSkill(false);
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) return;
    const result = await createTag(newCommunityName.trim(), 'communities');
    if (result && 'error' in result) {
      // Tag already exists, select it
      toggleTag(result.existingTag.id);
      toast({ title: t('profileTagAdded') });
    } else if (result && 'id' in result) {
      toggleTag(result.id);
      toast({ title: t('tagsCommunityCreated') });
      refreshTags();
    }
    setNewCommunityName('');
    setAddingCommunity(false);
  };

  const handleSelectExistingSkill = (tag: Tag) => {
    toggleTag(tag.id);
    toast({ title: t('profileTagAdded') });
    setNewSkillName('');
    setAddingSkill(false);
  };

  const handleSelectExistingCommunity = (tag: Tag) => {
    toggleTag(tag.id);
    toast({ title: t('profileTagAdded') });
    setNewCommunityName('');
    setAddingCommunity(false);
  };

  const skillTags = getTagsByCategory('skills');
  const communityTags = getTagsByCategory('communities');

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

              <div className="space-y-2">
                <Label htmlFor="deadline">{t('taskDeadlineOptional')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('taskRelatedSkills')}</Label>
                  <Button variant="ghost" size="sm" onClick={() => setAddingSkill(true)}>
                    <Plus className="w-3 h-3 mr-1" />{t('createNewTag')}
                  </Button>
                </div>
                {addingSkill && (
                  <TagInputWithSuggestions
                    value={newSkillName}
                    onChange={setNewSkillName}
                    onSubmit={handleCreateSkill}
                    onCancel={() => setAddingSkill(false)}
                    onSelectExisting={handleSelectExistingSkill}
                    placeholder={t('tagsSkillName')}
                    category="skills"
                    existingTags={skillTags}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {skillTags.map(tag => <TagBadge key={tag.id} name={tag.name} category="skills" displayName={getTranslatedName(tag)} selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('taskCommunities')}</Label>
                  <Button variant="ghost" size="sm" onClick={() => setAddingCommunity(true)}>
                    <Plus className="w-3 h-3 mr-1" />{t('createNewTag')}
                  </Button>
                </div>
                {addingCommunity && (
                  <TagInputWithSuggestions
                    value={newCommunityName}
                    onChange={setNewCommunityName}
                    onSubmit={handleCreateCommunity}
                    onCancel={() => setAddingCommunity(false)}
                    onSelectExisting={handleSelectExistingCommunity}
                    placeholder={t('tagsCommunityName')}
                    category="communities"
                    existingTags={communityTags}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {communityTags.map(tag => <TagBadge key={tag.id} name={tag.name} category="communities" displayName={getTranslatedName(tag)} selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />)}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1">{t('cancel')}</Button>
                <Button onClick={handleSubmit} className="flex-1 bg-gradient-primary hover:opacity-90" disabled={!title.trim() || loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editTask ? t('save') : t('taskCreate')}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
