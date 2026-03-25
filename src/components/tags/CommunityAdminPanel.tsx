import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Upload, Users, Eye, EyeOff, Loader2, Plus, Trash2, Search, Image as ImageIcon, AlertTriangle, MapPin, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types';
import { removeAccents } from '@/lib/stringUtils';
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete';

interface CommunitySettings {
  id?: string;
  tag_id: string;
  header_image_url: string | null;
  logo_url: string | null;
  logo_emoji: string | null;
  is_hidden: boolean;
  location?: string | null;
}

interface AdminEntry {
  id: string;
  user_id: string;
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

interface CommunityAdminPanelProps {
  tagId: string;
  tagCategory: string;
  onSettingsChange?: (settings: CommunitySettings) => void;
}

export function CommunityAdminPanel({ tagId, tagCategory, onSettingsChange }: CommunityAdminPanelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<CommunitySettings>({
    tag_id: tagId,
    header_image_url: null,
    logo_url: null,
    logo_emoji: null,
    is_hidden: false,
    location: null,
  });

  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminResults, setAdminResults] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingTag, setDeletingTag] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (user && tagCategory === 'communities') {
      checkAdminAndFetch();
    } else {
      setLoading(false);
    }
  }, [user, tagId, tagCategory]);

  const checkAdminAndFetch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check if user is admin of this community
      const { data: adminData } = await supabase
        .from('community_admins')
        .select('id')
        .eq('tag_id', tagId)
        .eq('user_id', user.id)
        .maybeSingle();

      const userIsAdmin = !!adminData;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // Fetch settings
        const { data: settingsData } = await supabase
          .from('community_settings')
          .select('*')
          .eq('tag_id', tagId)
          .maybeSingle();

        if (settingsData) {
          setSettings(settingsData as CommunitySettings);
          onSettingsChange?.(settingsData as CommunitySettings);
        }

        // Fetch admins with profiles
        const { data: adminsData } = await supabase
          .from('community_admins')
          .select('id, user_id')
          .eq('tag_id', tagId);

        if (adminsData && adminsData.length > 0) {
          const userIds = adminsData.map(a => a.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
          setAdmins(adminsData.map(a => ({
            ...a,
            profile: profileMap.get(a.user_id),
          })));
        }
      }
    } catch (err) {
      console.error('Error checking admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (file: File, type: 'header' | 'logo') => {
    if (!user) return;
    const setter = type === 'header' ? setUploadingHeader : setUploadingLogo;
    setter(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `community-${tagId}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('task-images').getPublicUrl(path);
      const url = urlData.publicUrl;

      const update = type === 'header'
        ? { header_image_url: url }
        : { logo_url: url, logo_emoji: null };

      await saveSettings({ ...settings, ...update });
      toast({ title: language === 'pt' ? 'Imagem atualizada!' : 'Image updated!' });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: language === 'pt' ? 'Erro ao enviar imagem' : 'Error uploading image', variant: 'destructive' });
    } finally {
      setter(false);
    }
  };

  const saveSettings = async (newSettings: CommunitySettings) => {
    setSaving(true);
    try {
      if (newSettings.id) {
        const { error } = await supabase
          .from('community_settings')
          .update({
            header_image_url: newSettings.header_image_url,
            logo_url: newSettings.logo_url,
            logo_emoji: newSettings.logo_emoji,
            is_hidden: newSettings.is_hidden,
            location: newSettings.location,
          })
          .eq('id', newSettings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('community_settings')
          .insert({
            tag_id: tagId,
            header_image_url: newSettings.header_image_url,
            logo_url: newSettings.logo_url,
            logo_emoji: newSettings.logo_emoji,
            is_hidden: newSettings.is_hidden,
            location: newSettings.location,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) newSettings = { ...newSettings, id: data.id };
      }

      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: language === 'pt' ? 'Erro ao salvar' : 'Error saving', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHidden = async (hidden: boolean) => {
    await saveSettings({ ...settings, is_hidden: hidden });
    toast({
      title: hidden
        ? (language === 'pt' ? 'Comunidade ocultada' : 'Community hidden')
        : (language === 'pt' ? 'Comunidade visível' : 'Community visible'),
    });
  };


  const handleSearchAdmin = async (q: string) => {
    setAdminSearch(q);
    if (q.length < 2) {
      setAdminResults([]);
      return;
    }
    setSearching(true);
    try {
      const normalized = removeAccents(q.toLowerCase());
      const existingIds = admins.map(a => a.user_id);

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(10);

      if (data) {
        const filtered = data.filter(p =>
          !existingIds.includes(p.id) &&
          removeAccents((p.full_name || '').toLowerCase()).includes(normalized)
        );
        setAdminResults(filtered);
      }
    } catch {
      // ignore
    }
    setSearching(false);
  };

  const handleAddAdmin = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('community_admins')
        .insert({ tag_id: tagId, user_id: profileId });
      if (error) throw error;
      toast({ title: language === 'pt' ? 'Admin adicionado!' : 'Admin added!' });
      setAdminSearch('');
      setAdminResults([]);
      await checkAdminAndFetch();
    } catch (err) {
      console.error('Add admin error:', err);
      toast({ title: language === 'pt' ? 'Erro ao adicionar admin' : 'Error adding admin', variant: 'destructive' });
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (admins.length <= 1) {
      toast({ title: language === 'pt' ? 'Deve haver pelo menos um admin' : 'Must have at least one admin', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('community_admins')
        .delete()
        .eq('id', adminId);
      if (error) throw error;
      toast({ title: language === 'pt' ? 'Admin removido' : 'Admin removed' });
      await checkAdminAndFetch();
    } catch {
      toast({ title: language === 'pt' ? 'Erro ao remover admin' : 'Error removing admin', variant: 'destructive' });
    }
  };

  if (loading || !isAdmin || tagCategory !== 'communities') return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Settings className="w-4 h-4" />
          {language === 'pt' ? 'Configurações da Comunidade' : 'Community Settings'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-5 p-4 rounded-lg border bg-card">
        {/* Header Image */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4" />
            {language === 'pt' ? 'Imagem de Capa' : 'Header Image'}
          </Label>
          {settings.header_image_url && (
            <div className="relative rounded-lg overflow-hidden h-32">
              <img src={settings.header_image_url} alt="Header" className="w-full h-full object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => saveSettings({ ...settings, header_image_url: null })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <Button variant="outline" size="sm" asChild disabled={uploadingHeader}>
              <span>
                {uploadingHeader ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                {language === 'pt' ? 'Enviar imagem' : 'Upload image'}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadImage(file, 'header');
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4" />
            {language === 'pt' ? 'Logo' : 'Logo'}
          </Label>
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <div className="relative">
                <img src={settings.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5"
                  onClick={() => saveSettings({ ...settings, logo_url: null })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ) : null}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                <span>
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                  {language === 'pt' ? 'Enviar logo' : 'Upload logo'}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImage(file, 'logo');
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {/* Hidden Toggle */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            {settings.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {language === 'pt' ? 'Ocultar comunidade' : 'Hide community'}
          </Label>
          <Switch
            checked={settings.is_hidden}
            onCheckedChange={handleToggleHidden}
            disabled={saving}
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" />
            {language === 'pt' ? 'Localidade' : 'Location'}
          </Label>
          <LocationAutocomplete
            value={settings.location || ''}
            onChange={(val) => saveSettings({ ...settings, location: val || null })}
            placeholder={language === 'pt' ? 'Cidade, Estado' : 'City, State'}
          />
        </div>

        {/* Admin Management */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            {language === 'pt' ? 'Administradores' : 'Administrators'} ({admins.length})
          </Label>
          <div className="space-y-1.5">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={admin.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {admin.profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{admin.profile?.full_name || 'User'}</span>
                </div>
                {admin.user_id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemoveAdmin(admin.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add admin search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={adminSearch}
              onChange={e => handleSearchAdmin(e.target.value)}
              placeholder={language === 'pt' ? 'Buscar para adicionar admin...' : 'Search to add admin...'}
              className="pl-9 h-8 text-sm"
            />
          </div>
          {searching && (
            <div className="flex justify-center py-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {adminResults.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {adminResults.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {p.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{p.full_name || 'User'}</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleAddAdmin(p.id)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Tag */}
        <div className="pt-3 border-t border-destructive/20">
          {!confirmDelete ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="w-4 h-4" />
              {language === 'pt' ? 'Excluir comunidade' : 'Delete community'}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {language === 'pt' ? 'Tem certeza? Isso não pode ser desfeito.' : 'Are you sure? This cannot be undone.'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  disabled={deletingTag}
                  onClick={async () => {
                    setDeletingTag(true);
                    try {
                      const { error } = await supabase.from('tags').delete().eq('id', tagId);
                      if (error) throw error;
                      toast({ title: language === 'pt' ? 'Comunidade excluída' : 'Community deleted' });
                      navigate('/dashboard');
                    } catch (err) {
                      console.error(err);
                      toast({ title: language === 'pt' ? 'Erro ao excluir' : 'Error deleting', variant: 'destructive' });
                    } finally {
                      setDeletingTag(false);
                    }
                  }}
                >
                  {deletingTag ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'pt' ? 'Confirmar' : 'Confirm')}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                  {language === 'pt' ? 'Cancelar' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
