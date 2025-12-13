import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagBadge } from '@/components/ui/tag-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';

interface TagsManagerProps {
  open: boolean;
  onClose: () => void;
}

export function TagsManager({ open, onClose }: TagsManagerProps) {
  const { getTagsByCategory, createTag, refreshTags } = useTags();
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
      toast({ title: 'Habilidade criada!' });
      setNewSkillName('');
      setAddingSkill(false);
      refreshTags();
    } else {
      toast({ 
        title: 'Erro', 
        description: 'Tag já existe ou erro ao criar.',
        variant: 'destructive' 
      });
    }
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) return;
    
    const tag = await createTag(newCommunityName.trim(), 'communities');
    if (tag) {
      toast({ title: 'Comunidade criada!' });
      setNewCommunityName('');
      setAddingCommunity(false);
      refreshTags();
    } else {
      toast({ 
        title: 'Erro', 
        description: 'Tag já existe ou erro ao criar.',
        variant: 'destructive' 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Skills Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Habilidades e Interesses</h3>
                <p className="text-sm text-muted-foreground">
                  {skillTags.length} tags disponíveis
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingSkill(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {addingSkill && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex gap-2"
              >
                <Input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Nome da habilidade..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSkill()}
                  autoFocus
                />
                <Button onClick={handleCreateSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setAddingSkill(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg min-h-[100px]">
              {skillTags.map(tag => (
                <TagBadge key={tag.id} name={tag.name} category="skills" />
              ))}
              {skillTags.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma habilidade cadastrada ainda.
                </p>
              )}
            </div>
          </div>

          {/* Communities Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Grupos e Comunidades</h3>
                <p className="text-sm text-muted-foreground">
                  {communityTags.length} tags disponíveis
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingCommunity(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {addingCommunity && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex gap-2"
              >
                <Input
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  placeholder="Nome da comunidade..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCommunity()}
                  autoFocus
                />
                <Button onClick={handleCreateCommunity}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setAddingCommunity(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg min-h-[100px]">
              {communityTags.map(tag => (
                <TagBadge key={tag.id} name={tag.name} category="communities" />
              ))}
              {communityTags.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma comunidade cadastrada ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
