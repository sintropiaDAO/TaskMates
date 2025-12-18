import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTags } from '@/hooks/useTags';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface TagsManagerProps {
  open: boolean;
  onClose: () => void;
}

export function TagsManager({ open, onClose }: TagsManagerProps) {
  const { getTagsByCategory, createTag, refreshTags } = useTags();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [newSkillName, setNewSkillName] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [addingCommunity, setAddingCommunity] = useState(false);

  const skillTags = getTagsByCategory('skills');
  const communityTags = getTagsByCategory('communities');

  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) return;
    const tag = await createTag(newSkillName.trim(), 'skills');
    if (tag) {
      toast({ title: t('tagsSkillCreated') });
      setNewSkillName('');
      setAddingSkill(false);
      refreshTags();
    } else {
      toast({ title: t('tagsCreateError'), description: t('tagsExistsOrError'), variant: 'destructive' });
    }
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) return;
    const tag = await createTag(newCommunityName.trim(), 'communities');
    if (tag) {
      toast({ title: t('tagsCommunityCreated') });
      setNewCommunityName('');
      setAddingCommunity(false);
      refreshTags();
    } else {
      toast({ title: t('tagsCreateError'), description: t('tagsExistsOrError'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('tagsManageTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{t('tagsSkillsTitle')}</h3>
                <p className="text-sm text-muted-foreground">{skillTags.length} {t('tagsAvailable')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAddingSkill(true)}>
                <Plus className="w-4 h-4 mr-1" />{t('add')}
              </Button>
            </div>

            {addingSkill && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2">
                <Input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder={t('tagsSkillName')} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleCreateSkill()} autoFocus />
                <Button onClick={handleCreateSkill}><Plus className="w-4 h-4" /></Button>
                <Button variant="ghost" onClick={() => setAddingSkill(false)}><X className="w-4 h-4" /></Button>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg min-h-[100px]">
              {skillTags.map(tag => <TagBadge key={tag.id} name={tag.name} category="skills" />)}
              {skillTags.length === 0 && <p className="text-sm text-muted-foreground">{t('tagsNoSkills')}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{t('tagsCommunitiesTitle')}</h3>
                <p className="text-sm text-muted-foreground">{communityTags.length} {t('tagsAvailable')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAddingCommunity(true)}>
                <Plus className="w-4 h-4 mr-1" />{t('add')}
              </Button>
            </div>

            {addingCommunity && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2">
                <Input value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} placeholder={t('tagsCommunityName')} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleCreateCommunity()} autoFocus />
                <Button onClick={handleCreateCommunity}><Plus className="w-4 h-4" /></Button>
                <Button variant="ghost" onClick={() => setAddingCommunity(false)}><X className="w-4 h-4" /></Button>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg min-h-[100px]">
              {communityTags.map(tag => <TagBadge key={tag.id} name={tag.name} category="communities" />)}
              {communityTags.length === 0 && <p className="text-sm text-muted-foreground">{t('tagsNoCommunities')}</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
