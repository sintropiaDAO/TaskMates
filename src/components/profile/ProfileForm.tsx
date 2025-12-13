import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, FileText, Save, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const { tags, userTags, addUserTag, removeUserTag, createTag, getTagsByCategory, getUserTagsByCategory } = useTags();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setSaving] = useState(false);
  const [newSkillTag, setNewSkillTag] = useState('');
  const [newCommunityTag, setNewCommunityTag] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        location,
        bio,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Perfil salvo!' });
      await refreshProfile();
      navigate('/dashboard');
    }
    setSaving(false);
  };

  const handleAddTag = async (tagId: string) => {
    const success = await addUserTag(tagId);
    if (success) {
      toast({ title: 'Tag adicionada!' });
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const success = await removeUserTag(tagId);
    if (success) {
      toast({ title: 'Tag removida!' });
    }
  };

  const handleCreateAndAddTag = async (name: string, category: 'skills' | 'communities') => {
    if (!name.trim()) return;
    
    const tag = await createTag(name.trim(), category);
    if (tag) {
      await addUserTag(tag.id);
      toast({ title: 'Tag criada e adicionada!' });
      if (category === 'skills') {
        setNewSkillTag('');
      } else {
        setNewCommunityTag('');
      }
    }
  };

  const userSkillTagIds = getUserTagsByCategory('skills').map(ut => ut.tag_id);
  const userCommunityTagIds = getUserTagsByCategory('communities').map(ut => ut.tag_id);

  const availableSkillTags = getTagsByCategory('skills').filter(t => !userSkillTagIds.includes(t.id));
  const availableCommunityTags = getTagsByCategory('communities').filter(t => !userCommunityTagIds.includes(t.id));

  return (
    <div className="min-h-screen bg-gradient-hero py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="glass rounded-2xl p-8 shadow-soft">
          <h1 className="text-3xl font-display font-bold mb-2">Editar Perfil</h1>
          <p className="text-muted-foreground mb-8">
            Complete seu perfil para encontrar tarefas relevantes
          </p>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localidade</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Cidade, Estado"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Mini bio</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre você..."
                    className="pl-10 min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            {/* Skills Tags */}
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Habilidades e Interesses</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione ou crie tags que representam suas habilidades
                </p>
              </div>

              {/* Selected Skills */}
              <div className="flex flex-wrap gap-2">
                {getUserTagsByCategory('skills').map(ut => (
                  <TagBadge
                    key={ut.id}
                    name={ut.tag?.name || ''}
                    category="skills"
                    onRemove={() => handleRemoveTag(ut.tag_id)}
                  />
                ))}
              </div>

              {/* Add new skill tag */}
              <div className="flex gap-2">
                <Input
                  value={newSkillTag}
                  onChange={(e) => setNewSkillTag(e.target.value)}
                  placeholder="Criar nova habilidade..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAndAddTag(newSkillTag, 'skills');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCreateAndAddTag(newSkillTag, 'skills')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick select skills */}
              <div className="flex flex-wrap gap-2">
                {availableSkillTags.slice(0, 10).map(tag => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    category="skills"
                    onClick={() => handleAddTag(tag.id)}
                  />
                ))}
              </div>
            </div>

            {/* Communities Tags */}
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Grupos e Comunidades</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione comunidades das quais você faz parte
                </p>
              </div>

              {/* Selected Communities */}
              <div className="flex flex-wrap gap-2">
                {getUserTagsByCategory('communities').map(ut => (
                  <TagBadge
                    key={ut.id}
                    name={ut.tag?.name || ''}
                    category="communities"
                    onRemove={() => handleRemoveTag(ut.tag_id)}
                  />
                ))}
              </div>

              {/* Add new community tag */}
              <div className="flex gap-2">
                <Input
                  value={newCommunityTag}
                  onChange={(e) => setNewCommunityTag(e.target.value)}
                  placeholder="Criar nova comunidade..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAndAddTag(newCommunityTag, 'communities');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCreateAndAddTag(newCommunityTag, 'communities')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick select communities */}
              <div className="flex flex-wrap gap-2">
                {availableCommunityTags.slice(0, 10).map(tag => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    category="communities"
                    onClick={() => handleAddTag(tag.id)}
                  />
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Perfil
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
