import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tag, UserTag, TagCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toTitleCase } from '@/lib/formatters';

const CATEGORY_LABEL_PT: Record<TagCategory, string> = {
  skills: 'Habilidade',
  communities: 'Comunidade',
  physical_resources: 'Recurso',
};
const CATEGORY_LABEL_EN: Record<TagCategory, string> = {
  skills: 'Skill',
  communities: 'Community',
  physical_resources: 'Resource',
};


interface TagTranslation {
  id: string;
  tag_id: string;
  language: string;
  translated_name: string;
}

export function useTags() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [tags, setTags] = useState<Tag[]>([]);
  const [translations, setTranslations] = useState<TagTranslation[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setTags(data as Tag[]);
    }
    setLoading(false);
  };

  const fetchTranslations = async () => {
    const { data } = await supabase
      .from('tag_translations')
      .select('*');
    
    if (data) {
      setTranslations(data);
    }
  };

  const fetchUserTags = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_tags')
      .select('*, tag:tags(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUserTags(data.map(ut => ({
        ...ut,
        tag: ut.tag as Tag
      })));
    }
  };

  useEffect(() => {
    fetchTags();
    fetchTranslations();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserTags();
    }
  }, [user]);

  // Get translated tag name - fallback to English only for non-pt/en languages
  const getTranslatedName = (tag: Tag): string => {
    // Try current language first
    const translation = translations.find(
      t => t.tag_id === tag.id && t.language === language
    );
    if (translation?.translated_name) {
      return translation.translated_name;
    }
    
    // For Portuguese and English, if no translation exists, use original name
    // Fallback to English only for other languages (e.g., Spanish, French, etc.)
    if (language !== 'pt' && language !== 'en') {
      const englishTranslation = translations.find(
        t => t.tag_id === tag.id && t.language === 'en'
      );
      if (englishTranslation?.translated_name) {
        return englishTranslation.translated_name;
      }
    }
    
    // Original name as fallback
    return tag.name;
  };

  // Get tags with translated names
  const getTranslatedTags = (): (Tag & { displayName: string })[] => {
    return tags.map(tag => ({
      ...tag,
      displayName: getTranslatedName(tag)
    }));
  };

  const createTag = async (name: string, category: TagCategory) => {
    const catLabel = (language === 'pt' ? CATEGORY_LABEL_PT : CATEGORY_LABEL_EN)[category];

    if (!user) {
      toast.error(language === 'pt' ? 'Faça login para criar tags' : 'Sign in to create tags');
      return null;
    }

    const formattedName = toTitleCase(name);
    const normalizedName = formattedName.toLowerCase();

    // Duplicate guard: same name + same category
    const existingTag = tags.find(t =>
      t.name.toLowerCase() === normalizedName && t.category === category
    );
    if (existingTag) {
      toast.error(
        language === 'pt' ? 'Tag duplicada' : 'Duplicate tag',
        {
          description: language === 'pt'
            ? `Já existe "${formattedName}" em ${catLabel}.`
            : `"${formattedName}" already exists in ${catLabel}.`,
        }
      );
      return { error: 'duplicate', existingTag };
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: formattedName, category, created_by: user.id })
      .select()
      .single();

    if (!error && data) {
      setTags(prev => [...prev, data as Tag]);
      toast.success(
        language === 'pt' ? 'Tag criada' : 'Tag created',
        {
          description: language === 'pt'
            ? `"${formattedName}" adicionada em ${catLabel}.`
            : `"${formattedName}" added under ${catLabel}.`,
        }
      );
      return data as Tag;
    }
    if (error) {
      console.error('createTag error', error);
      toast.error(
        language === 'pt' ? 'Erro ao criar tag' : 'Failed to create tag',
        { description: error.message }
      );
      return { error: 'insert_failed', message: error.message } as any;
    }
    return null;
  };


  const deleteTag = async (tagId: string) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);
    
    if (!error) {
      setTags(prev => prev.filter(t => t.id !== tagId));
      return true;
    }
    return false;
  };

  const addUserTag = async (tagId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('user_tags')
      .insert({ user_id: user.id, tag_id: tagId });
    
    if (!error) {
      await fetchUserTags();
      return true;
    }
    return false;
  };

  const removeUserTag = async (tagId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('user_tags')
      .delete()
      .eq('user_id', user.id)
      .eq('tag_id', tagId);
    
    if (!error) {
      setUserTags(prev => prev.filter(ut => ut.tag_id !== tagId));
      return true;
    }
    return false;
  };

  const getTagsByCategory = (category: TagCategory) => {
    return tags.filter(tag => tag.category === category);
  };

  const getUserTagsByCategory = (category: TagCategory) => {
    return userTags.filter(ut => ut.tag?.category === category);
  };

  return {
    tags,
    userTags,
    loading,
    createTag,
    deleteTag,
    addUserTag,
    removeUserTag,
    getTagsByCategory,
    getUserTagsByCategory,
    getTranslatedName,
    getTranslatedTags,
    refreshTags: fetchTags,
    refreshUserTags: fetchUserTags,
    refreshTranslations: fetchTranslations,
  };
}
