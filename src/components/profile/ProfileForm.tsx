import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, FileText, Save, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LanguageSelector } from '@/components/LanguageSelector';

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { addUserTag, removeUserTag, createTag, getTagsByCategory, getUserTagsByCategory } = useTags();
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
    const { error } = await supabase.from('profiles').update({ full_name: fullName, location, bio }).eq('id', user.id);
    if (error) {
      toast({ title: t('profileSaveError'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('profileSaved') });
      await refreshProfile();
      navigate('/dashboard');
    }
    setSaving(false);
  };

  const handleAddTag = async (tagId: string) => {
    const success = await addUserTag(tagId);
    if (success) toast({ title: t('profileTagAdded') });
  };

  const handleRemoveTag = async (tagId: string) => {
    const success = await removeUserTag(tagId);
    if (success) toast({ title: t('profileTagRemoved') });
  };

  const handleCreateAndAddTag = async (name: string, category: 'skills' | 'communities') => {
    if (!name.trim()) return;
    const result = await createTag(name.trim(), category);
    if (result && 'error' in result) {
      // Tag already exists, use the existing one
      await addUserTag(result.existingTag.id);
      toast({ title: t('profileTagAdded') });
      category === 'skills' ? setNewSkillTag('') : setNewCommunityTag('');
    } else if (result && 'id' in result) {
      await addUserTag(result.id);
      toast({ title: t('profileTagCreatedAdded') });
      category === 'skills' ? setNewSkillTag('') : setNewCommunityTag('');
    }
  };

  const userSkillTagIds = getUserTagsByCategory('skills').map(ut => ut.tag_id);
  const userCommunityTagIds = getUserTagsByCategory('communities').map(ut => ut.tag_id);
  const availableSkillTags = getTagsByCategory('skills').filter(t => !userSkillTagIds.includes(t.id));
  const availableCommunityTags = getTagsByCategory('communities').filter(t => !userCommunityTagIds.includes(t.id));

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="absolute top-4 right-4 z-20"><LanguageSelector /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <div className="glass rounded-2xl p-8 shadow-soft">
          <h1 className="text-3xl font-display font-bold mb-2">{t('profileEditTitle')}</h1>
          <p className="text-muted-foreground mb-8">{t('profileEditSubtitle')}</p>

          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <AvatarUpload />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('profileFullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('profileFullNamePlaceholder')} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('profileLocation')}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('profileLocationPlaceholder')} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">{t('profileBio')}</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('profileBioPlaceholder')} className="pl-10 min-h-[100px]" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div><Label className="text-lg font-semibold">{t('profileSkillsTitle')}</Label><p className="text-sm text-muted-foreground">{t('profileSkillsDescription')}</p></div>
              <div className="flex flex-wrap gap-2">{getUserTagsByCategory('skills').map(ut => <TagBadge key={ut.id} name={ut.tag?.name || ''} category="skills" onRemove={() => handleRemoveTag(ut.tag_id)} />)}</div>
              <div className="flex gap-2">
                <Input value={newSkillTag} onChange={(e) => setNewSkillTag(e.target.value)} placeholder={t('profileCreateSkill')} className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndAddTag(newSkillTag, 'skills'); }}} />
                <Button variant="outline" size="icon" onClick={() => handleCreateAndAddTag(newSkillTag, 'skills')}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">{availableSkillTags.slice(0, 10).map(tag => <TagBadge key={tag.id} name={tag.name} category="skills" onClick={() => handleAddTag(tag.id)} />)}</div>
            </div>

            <div className="space-y-4">
              <div><Label className="text-lg font-semibold">{t('profileCommunitiesTitle')}</Label><p className="text-sm text-muted-foreground">{t('profileCommunitiesDescription')}</p></div>
              <div className="flex flex-wrap gap-2">{getUserTagsByCategory('communities').map(ut => <TagBadge key={ut.id} name={ut.tag?.name || ''} category="communities" onRemove={() => handleRemoveTag(ut.tag_id)} />)}</div>
              <div className="flex gap-2">
                <Input value={newCommunityTag} onChange={(e) => setNewCommunityTag(e.target.value)} placeholder={t('profileCreateCommunity')} className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndAddTag(newCommunityTag, 'communities'); }}} />
                <Button variant="outline" size="icon" onClick={() => handleCreateAndAddTag(newCommunityTag, 'communities')}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">{availableCommunityTags.slice(0, 10).map(tag => <TagBadge key={tag.id} name={tag.name} category="communities" onClick={() => handleAddTag(tag.id)} />)}</div>
            </div>

            <Button onClick={handleSave} className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t('profileSaveProfile')}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
