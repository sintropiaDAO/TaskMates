import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tag, UserTag } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toTitleCase } from '@/lib/formatters';

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
      .eq('user_id', user.id);
    
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

  const createTag = async (name: string, category: 'skills' | 'communities') => {
    if (!user) return null;

    // Format name to title case
    const formattedName = toTitleCase(name);
    
    // Check for duplicate (case-insensitive)
    const normalizedName = formattedName.toLowerCase();
    const existingTag = tags.find(t => 
      t.name.toLowerCase() === normalizedName && t.category === category
    );
    
    if (existingTag) {
      return { error: 'duplicate', existingTag };
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: formattedName, category, created_by: user.id })
      .select()
      .single();
    
    if (!error && data) {
      setTags(prev => [...prev, data as Tag]);
      return data as Tag;
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

  const getTagsByCategory = (category: 'skills' | 'communities') => {
    return tags.filter(tag => tag.category === category);
  };

  const getUserTagsByCategory = (category: 'skills' | 'communities') => {
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
