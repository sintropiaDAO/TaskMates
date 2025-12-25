import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Testimonial, Tag } from '@/types';

export function useTestimonials(profileUserId: string | undefined) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestimonials = async () => {
    if (!profileUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data: testimonialsData } = await supabase
      .from('testimonials')
      .select('*')
      .eq('profile_user_id', profileUserId)
      .order('created_at', { ascending: false });

    if (testimonialsData && testimonialsData.length > 0) {
      // Fetch authors
      const authorIds = [...new Set(testimonialsData.map(t => t.author_user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('*')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch tags for each testimonial
      const testimonialIds = testimonialsData.map(t => t.id);
      const { data: testimonialTags } = await supabase
        .from('testimonial_tags')
        .select('testimonial_id, tag_id')
        .in('testimonial_id', testimonialIds);

      const tagIds = [...new Set(testimonialTags?.map(tt => tt.tag_id) || [])];
      const { data: tags } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);

      const tagMap = new Map(tags?.map(t => [t.id, t]) || []);
      const tagsByTestimonial = new Map<string, Tag[]>();
      
      testimonialTags?.forEach(tt => {
        const tag = tagMap.get(tt.tag_id);
        if (tag) {
          const existing = tagsByTestimonial.get(tt.testimonial_id) || [];
          tagsByTestimonial.set(tt.testimonial_id, [...existing, tag as Tag]);
        }
      });

      setTestimonials(testimonialsData.map(t => ({
        ...t,
        author: profileMap.get(t.author_user_id) as Testimonial['author'],
        tags: tagsByTestimonial.get(t.id) || [],
      })));
    } else {
      setTestimonials([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchTestimonials();
  }, [profileUserId]);

  const addTestimonial = async (
    content: string,
    tagIds: string[] = []
  ): Promise<boolean> => {
    if (!profileUserId) return false;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data: testimonial, error } = await supabase
      .from('testimonials')
      .insert({
        profile_user_id: profileUserId,
        author_user_id: userData.user.id,
        content,
      })
      .select()
      .single();

    if (error || !testimonial) return false;

    // Add tags
    if (tagIds.length > 0) {
      await supabase
        .from('testimonial_tags')
        .insert(tagIds.map(tagId => ({
          testimonial_id: testimonial.id,
          tag_id: tagId,
        })));
    }

    await fetchTestimonials();
    return true;
  };

  const deleteTestimonial = async (testimonialId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', testimonialId);

    if (!error) {
      setTestimonials(prev => prev.filter(t => t.id !== testimonialId));
      return true;
    }
    return false;
  };

  return {
    testimonials,
    loading,
    addTestimonial,
    deleteTestimonial,
    refetch: fetchTestimonials,
  };
}