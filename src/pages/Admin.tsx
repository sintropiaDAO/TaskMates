import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Users, Languages, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TagBadge } from '@/components/ui/tag-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Tag as TagType } from '@/types';

interface UserWithRole extends Profile {
  role?: string;
}

interface TagTranslation {
  id: string;
  tag_id: string;
  language: string;
  translated_name: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [translations, setTranslations] = useState<TagTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [newTranslation, setNewTranslation] = useState({ language: '', translated_name: '' });
  const [savingTranslation, setSavingTranslation] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, adminLoading]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchTags(), fetchTranslations()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (profiles) {
      // Fetch roles for each user
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.id)?.role || 'user'
      }));

      setUsers(usersWithRoles as UserWithRole[]);
    }
  };

  const fetchTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (data) {
      setTags(data as TagType[]);
    }
  };

  const fetchTranslations = async () => {
    const { data } = await supabase
      .from('tag_translations')
      .select('*');

    if (data) {
      setTranslations(data);
    }
  };

  const handleAddAdmin = async (userId: string) => {
    setAddingAdmin(true);
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success') });
      fetchUsers();
    }
    setAddingAdmin(false);
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast({ title: t('error'), description: 'Você não pode remover sua própria permissão de admin', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success') });
      fetchUsers();
    }
  };

  const handleAddTranslation = async () => {
    if (!selectedTag || !newTranslation.language || !newTranslation.translated_name.trim()) return;

    setSavingTranslation(true);
    const { error } = await supabase
      .from('tag_translations')
      .upsert({
        tag_id: selectedTag.id,
        language: newTranslation.language,
        translated_name: newTranslation.translated_name.trim()
      }, { onConflict: 'tag_id,language' });

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success') });
      setNewTranslation({ language: '', translated_name: '' });
      fetchTranslations();
    }
    setSavingTranslation(false);
  };

  const handleDeleteTranslation = async (translationId: string) => {
    const { error } = await supabase
      .from('tag_translations')
      .delete()
      .eq('id', translationId);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success') });
      fetchTranslations();
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    setDeletingTagId(tagId);
    
    // First delete related translations
    await supabase
      .from('tag_translations')
      .delete()
      .eq('tag_id', tagId);

    // Delete related task_tags
    await supabase
      .from('task_tags')
      .delete()
      .eq('tag_id', tagId);

    // Delete related user_tags
    await supabase
      .from('user_tags')
      .delete()
      .eq('tag_id', tagId);

    // Delete related testimonial_tags
    await supabase
      .from('testimonial_tags')
      .delete()
      .eq('tag_id', tagId);

    // Finally delete the tag
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('tagDeleted') });
      if (selectedTag?.id === tagId) {
        setSelectedTag(null);
      }
      fetchTags();
      fetchTranslations();
    }
    setDeletingTagId(null);
  };

  const getTagTranslations = (tagId: string) => {
    return translations.filter(t => t.tag_id === tagId);
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-display font-bold">{t('adminPanel')}</h1>
          </div>

          <Tabs defaultValue="users">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('adminUsers')}
              </TabsTrigger>
              <TabsTrigger value="translations" className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {t('adminTranslations')}
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchUsers')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.full_name || t('anonymous')}</p>
                        <p className="text-xs text-muted-foreground">{u.location || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.role === 'admin' ? (
                        <>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            Admin
                          </span>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdmin(u.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddAdmin(u.id)}
                          disabled={addingAdmin}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t('makeAdmin')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Translations Tab */}
            <TabsContent value="translations" className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchTags')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tags List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <h3 className="font-semibold text-sm mb-2">{t('selectTag')}</h3>
                  {filteredTags.map(tag => (
                    <div
                      key={tag.id}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedTag?.id === tag.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedTag(tag)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <TagBadge name={tag.name} category={tag.category} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {getTagTranslations(tag.id).length} {t('translations')}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={deletingTagId === tag.id}
                        className="text-destructive hover:text-destructive ml-2"
                        title={t('delete')}
                      >
                        {deletingTagId === tag.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Translation Editor */}
                <div className="space-y-4">
                  {selectedTag ? (
                    <>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <h3 className="font-semibold mb-2">{t('translationsFor')}</h3>
                        <TagBadge name={selectedTag.name} category={selectedTag.category} />
                      </div>

                      {/* Existing Translations */}
                      <div className="space-y-2">
                        {getTagTranslations(selectedTag.id).map(trans => (
                          <div key={trans.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                            <div>
                              <span className="text-xs font-medium uppercase text-muted-foreground mr-2">
                                {trans.language}
                              </span>
                              <span>{trans.translated_name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTranslation(trans.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add Translation Form */}
                      <div className="space-y-3 p-4 rounded-lg border border-border">
                        <h4 className="font-medium text-sm">{t('addTranslation')}</h4>
                        <div className="space-y-2">
                          <Label>{t('language')}</Label>
                          <Select
                            value={newTranslation.language}
                            onValueChange={(v) => setNewTranslation(prev => ({ ...prev, language: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectLanguage')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pt">Português</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Español</SelectItem>
                              <SelectItem value="fr">Français</SelectItem>
                              <SelectItem value="de">Deutsch</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('translatedName')}</Label>
                          <Input
                            value={newTranslation.translated_name}
                            onChange={(e) => setNewTranslation(prev => ({ ...prev, translated_name: e.target.value }))}
                            placeholder={t('translatedNamePlaceholder')}
                          />
                        </div>
                        <Button
                          onClick={handleAddTranslation}
                          disabled={!newTranslation.language || !newTranslation.translated_name.trim() || savingTranslation}
                          className="w-full"
                        >
                          {savingTranslation ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          {t('addTranslation')}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>{t('selectTagToTranslate')}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
