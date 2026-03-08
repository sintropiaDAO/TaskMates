import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, FileText, Save, Loader2, AtSign, Check, X } from 'lucide-react';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SocialLinks } from '@/types';

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const { addUserTag, removeUserTag, createTag, getUserTagsByCategory, getTranslatedName, refreshUserTags } = useTags();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [loading, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setSocialLinks(profile.social_links as SocialLinks || {});
    }
  }, [profile]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(username === profile?.username ? true : null);
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(false);
      return;
    }
    setCheckingUsername(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase.
      from('profiles').
      select('id').
      eq('username', username).
      maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [username, profile?.username]);

  // Auto-add pre-selected tag from URL
  useEffect(() => {
    const tagId = searchParams.get('tag');
    if (tagId && user) {
      const alreadyHas = getUserTagsByCategory('skills').some((ut) => ut.tag_id === tagId) ||
      getUserTagsByCategory('communities').some((ut) => ut.tag_id === tagId);
      if (!alreadyHas) {
        addUserTag(tagId).then((success) => {
          if (success) {
            toast({ title: language === 'pt' ? 'Tag pré-selecionada adicionada!' : 'Pre-selected tag added!' });
          }
        });
      }
    }
  }, [searchParams, user]);

  const handleSave = async () => {
    if (!user) return;
    if (usernameAvailable === false) {
      toast({ title: language === 'pt' ? 'Nome de usuário indisponível' : 'Username unavailable', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.
    from('profiles').
    update({
      full_name: fullName,
      username: username || undefined,
      location,
      bio,
      social_links: JSON.parse(JSON.stringify(socialLinks))
    }).
    eq('id', user.id);
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

  const handleCreateAndAddTag = async (name: string, category: 'skills' | 'communities' | 'physical_resources') => {
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
    const userSkillIds = getUserTagsByCategory('skills').map((ut) => ut.tag_id);
    if (userSkillIds.includes(tagId)) {
      await removeUserTag(tagId);
      toast({ title: t('profileTagRemoved') });
    } else {
      await addUserTag(tagId);
      toast({ title: t('profileTagAdded') });
    }
  };

  const handleToggleCommunityTag = async (tagId: string) => {
    const userCommunityIds = getUserTagsByCategory('communities').map((ut) => ut.tag_id);
    if (userCommunityIds.includes(tagId)) {
      await removeUserTag(tagId);
      toast({ title: t('profileTagRemoved') });
    } else {
      await addUserTag(tagId);
      toast({ title: t('profileTagAdded') });
    }
  };

  const userSkillTagIds = getUserTagsByCategory('skills').map((ut) => ut.tag_id);
  const userCommunityTagIds = getUserTagsByCategory('communities').map((ut) => ut.tag_id);

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
                <Label htmlFor="username">{language === 'pt' ? 'Nome de usuário' : 'Username'}</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder={language === 'pt' ? 'seu_username' : 'your_username'}
                    className="pl-10 pr-10"
                    maxLength={30} />
                  
                  {username && username !== profile?.username &&
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ?
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> :
                    usernameAvailable ?
                    <Check className="w-4 h-4 text-green-500" /> :

                    <X className="w-4 h-4 text-destructive" />
                    }
                    </div>
                  }
                </div>
                <p className={`text-xs ${usernameAvailable === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {checkingUsername ?
                  language === 'pt' ? 'Verificando...' : 'Checking...' :
                  usernameAvailable === false ?
                  !/^[a-zA-Z0-9_]{3,30}$/.test(username) ?
                  language === 'pt' ? 'Use 3-30 caracteres: letras, números e _' : 'Use 3-30 chars: letters, numbers and _' :
                  language === 'pt' ? 'Nome de usuário já em uso' : 'Username already taken' :
                  usernameAvailable === true && username !== profile?.username ?
                  language === 'pt' ? 'Nome de usuário disponível!' : 'Username available!' :
                  language === 'pt' ? 'Letras, números e _ (3-30 caracteres)' : 'Letters, numbers and _ (3-30 chars)'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t('profileLocation')}</Label>
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder={t('profileLocationPlaceholder')} />
                
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
              









              
              
              {/* Smart tag selector for skills */}
              <SmartTagSelector
                category="skills"
                selectedTagIds={userSkillTagIds}
                onToggleTag={handleToggleSkillTag}
                onCreateTag={(name) => handleCreateAndAddTag(name, 'skills')}
                maxVisibleTags={12} />
              
            </div>

            {/* Communities Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">{t('profileCommunitiesTitle')}</Label>
                <p className="text-sm text-muted-foreground">{t('profileCommunitiesDescription')}</p>
              </div>
              
              {/* User's selected communities */}
              <div className="flex flex-wrap gap-2">
                {getUserTagsByCategory('communities').map((ut) =>
                <TagBadge
                  key={ut.id}
                  name={ut.tag?.name || ''}
                  category="communities"
                  displayName={ut.tag ? getTranslatedName(ut.tag) : ''}
                  onRemove={() => handleRemoveTag(ut.tag_id)} />

                )}
              </div>
              
              {/* Smart tag selector for communities */}
              <SmartTagSelector
                category="communities"
                selectedTagIds={userCommunityTagIds}
                onToggleTag={handleToggleCommunityTag}
                onCreateTag={(name) => handleCreateAndAddTag(name, 'communities')}
                maxVisibleTags={12} />
              
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
    </div>);

}