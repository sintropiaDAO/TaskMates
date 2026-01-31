import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, FileText, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { SocialLinksInput } from '@/components/profile/SocialLinksInput';
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete';
import { SmartTagSelector } from '@/components/tags/SmartTagSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTags } from '@/hooks/useTags';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SocialLinks } from '@/types';

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { addUserTag, removeUserTag, createTag, getUserTagsByCategory, getTranslatedName, refreshUserTags } = useTags();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [loading, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setSocialLinks((profile.social_links as SocialLinks) || {});
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
        social_links: JSON.parse(JSON.stringify(socialLinks))
      })
      .eq('id', user.id);
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
      await addUserTag(result.existingTag.id);
      toast({ title: t('profileTagAdded') });
    } else if (result && 'id' in result) {
      await addUserTag(result.id);
      toast({ title: t('profileTagCreatedAdded') });
    }
    refreshUserTags();
  };

  const handleToggleSkillTag = async (tagId: string) => {
    const userSkillIds = getUserTagsByCategory('skills').map(ut => ut.tag_id);
    if (userSkillIds.includes(tagId)) {
      await removeUserTag(tagId);
      toast({ title: t('profileTagRemoved') });
    } else {
      await addUserTag(tagId);
      toast({ title: t('profileTagAdded') });
    }
  };

  const handleToggleCommunityTag = async (tagId: string) => {
    const userCommunityIds = getUserTagsByCategory('communities').map(ut => ut.tag_id);
    if (userCommunityIds.includes(tagId)) {
      await removeUserTag(tagId);
      toast({ title: t('profileTagRemoved') });
    } else {
      await addUserTag(tagId);
      toast({ title: t('profileTagAdded') });
    }
  };

  const userSkillTagIds = getUserTagsByCategory('skills').map(ut => ut.tag_id);
  const userCommunityTagIds = getUserTagsByCategory('communities').map(ut => ut.tag_id);

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
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
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder={t('profileLocationPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">{t('profileBio')}</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('profileBioPlaceholder')} className="pl-10 min-h-[100px]" />
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">{t('profileSkillsTitle')}</Label>
                <p className="text-sm text-muted-foreground">{t('profileSkillsDescription')}</p>
              </div>
              
              {/* User's selected skills */}
              <div className="flex flex-wrap gap-2">
                {getUserTagsByCategory('skills').map(ut => (
                  <TagBadge 
                    key={ut.id} 
                    name={ut.tag?.name || ''} 
                    category="skills" 
                    displayName={ut.tag ? getTranslatedName(ut.tag) : ''} 
                    onRemove={() => handleRemoveTag(ut.tag_id)} 
                  />
                ))}
              </div>
              
              {/* Smart tag selector for skills */}
              <SmartTagSelector
                category="skills"
                selectedTagIds={userSkillTagIds}
                onToggleTag={handleToggleSkillTag}
                onCreateTag={(name) => handleCreateAndAddTag(name, 'skills')}
                maxVisibleTags={12}
              />
            </div>

            {/* Communities Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">{t('profileCommunitiesTitle')}</Label>
                <p className="text-sm text-muted-foreground">{t('profileCommunitiesDescription')}</p>
              </div>
              
              {/* User's selected communities */}
              <div className="flex flex-wrap gap-2">
                {getUserTagsByCategory('communities').map(ut => (
                  <TagBadge 
                    key={ut.id} 
                    name={ut.tag?.name || ''} 
                    category="communities" 
                    displayName={ut.tag ? getTranslatedName(ut.tag) : ''} 
                    onRemove={() => handleRemoveTag(ut.tag_id)} 
                  />
                ))}
              </div>
              
              {/* Smart tag selector for communities */}
              <SmartTagSelector
                category="communities"
                selectedTagIds={userCommunityTagIds}
                onToggleTag={handleToggleCommunityTag}
                onCreateTag={(name) => handleCreateAndAddTag(name, 'communities')}
                maxVisibleTags={12}
              />
            </div>

            {/* Social Links & Contact Methods - moved after tags */}
            <SocialLinksInput socialLinks={socialLinks} onChange={setSocialLinks} />

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
