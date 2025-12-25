import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TagBadge } from '@/components/ui/tag-badge';
import { useTestimonials } from '@/hooks/useTestimonials';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface TestimonialsSectionProps {
  profileUserId: string;
  isOwnProfile: boolean;
}

export function TestimonialsSection({ profileUserId, isOwnProfile }: TestimonialsSectionProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { testimonials, loading, addTestimonial, deleteTestimonial } = useTestimonials(profileUserId);
  const { tags } = useTags();
  
  const [newContent, setNewContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dateLocale = language === 'pt' ? pt : enUS;

  const handleSubmit = async () => {
    if (!newContent.trim() || !user) return;
    
    setSubmitting(true);
    const success = await addTestimonial(newContent.trim(), selectedTags);
    
    if (success) {
      setNewContent('');
      setSelectedTags([]);
      setShowTagSelector(false);
      toast({ title: t('testimonialAdded') });
    } else {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteTestimonial(id);
    if (success) {
      toast({ title: t('testimonialDeleted') });
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="mb-6 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        {t('testimonials')} ({testimonials.length})
      </h3>

      {/* Add testimonial form (only for logged in users viewing other profiles) */}
      {user && !isOwnProfile && (
        <div className="mb-4 p-4 bg-muted/30 rounded-xl">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={t('writeTestimonial')}
            className="mb-3 min-h-[80px]"
          />
          
          {showTagSelector && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground mb-2">{t('addTagsToTestimonial')}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-1 rounded-full text-xs transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagSelector(!showTagSelector)}
            >
              {showTagSelector ? t('hideTags') : t('addTags')}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newContent.trim() || submitting}
              className="ml-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              {t('send')}
            </Button>
          </div>
        </div>
      )}

      {/* Testimonials list */}
      <div className="space-y-4">
        {testimonials.map(testimonial => (
          <div key={testimonial.id} className="bg-muted/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Avatar 
                className="w-10 h-10 cursor-pointer"
                onClick={() => navigate(`/profile/${testimonial.author_user_id}`)}
              >
                <AvatarImage src={testimonial.author?.avatar_url || ''} />
                <AvatarFallback>
                  {testimonial.author?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p 
                    className="font-medium cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/profile/${testimonial.author_user_id}`)}
                  >
                    {testimonial.author?.full_name || t('user')}
                  </p>
                  {testimonial.author_user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(testimonial.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {formatDistanceToNow(new Date(testimonial.created_at), { 
                    addSuffix: true,
                    locale: dateLocale
                  })}
                </p>
                <p className="text-muted-foreground">{testimonial.content}</p>
                {testimonial.tags && testimonial.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {testimonial.tags.map(tag => (
                      <TagBadge key={tag.id} name={tag.name} category={tag.category} size="sm" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {testimonials.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            {t('noTestimonialsYet')}
          </p>
        )}
      </div>
    </motion.div>
  );
}