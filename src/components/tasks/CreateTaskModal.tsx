import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { Task } from '@/types';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    taskType: 'offer' | 'request',
    tagIds: string[],
    deadline?: string
  ) => Promise<Task | null>;
  editTask?: Task | null;
}

export function CreateTaskModal({ open, onClose, onSubmit, editTask }: CreateTaskModalProps) {
  const { tags, getTagsByCategory } = useTags();
  const { t } = useLanguage();
  
  const [taskType, setTaskType] = useState<'offer' | 'request' | null>(editTask?.task_type || null);
  const [title, setTitle] = useState(editTask?.title || '');
  const [description, setDescription] = useState(editTask?.description || '');
  const [deadline, setDeadline] = useState(editTask?.deadline?.split('T')[0] || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(editTask?.tags?.map(t => t.id) || []);
  const [loading, setLoading] = useState(false);

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
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
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
          {!taskType && !editTask && (
            <div className="space-y-3">
              <Label>{t('taskTypeLabel')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTaskType('offer')} className="p-6 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{t('taskOffer')}</h3>
                  <p className="text-xs text-muted-foreground">{t('taskYouOfferSomething')}</p>
                </motion.button>
                
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setTaskType('request')} className="p-6 rounded-xl border-2 border-secondary/20 hover:border-secondary hover:bg-secondary/5 transition-all text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-1">{t('taskRequest')}</h3>
                  <p className="text-xs text-muted-foreground">{t('taskYouNeedHelp')}</p>
                </motion.button>
              </div>
            </div>
          )}

          {(taskType || editTask) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${taskType === 'offer' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                  {taskType === 'offer' ? t('taskOffer') : t('taskRequest')}
                </span>
                {!editTask && <Button variant="ghost" size="sm" onClick={() => setTaskType(null)}>{t('taskChangeType')}</Button>}
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
                <Label>{t('taskRelatedSkills')}</Label>
                <div className="flex flex-wrap gap-2">
                  {skillTags.map(tag => <TagBadge key={tag.id} name={tag.name} category="skills" selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('taskCommunities')}</Label>
                <div className="flex flex-wrap gap-2">
                  {communityTags.map(tag => <TagBadge key={tag.id} name={tag.name} category="communities" selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />)}
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
