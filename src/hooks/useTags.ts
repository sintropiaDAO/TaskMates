import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tag, UserTag } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
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
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserTags();
    }
  }, [user]);

  const createTag = async (name: string, category: 'skills' | 'communities') => {
    if (!user) return null;

    // Check for duplicate (case-insensitive)
    const normalizedName = name.trim().toLowerCase();
    const existingTag = tags.find(t => 
      t.name.toLowerCase() === normalizedName && t.category === category
    );
    
    if (existingTag) {
      return { error: 'duplicate', existingTag };
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: name.trim(), category, created_by: user.id })
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
    refreshTags: fetchTags,
    refreshUserTags: fetchUserTags,
  };
}
