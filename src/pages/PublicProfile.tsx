import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ArrowLeft, UserPlus, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TagBadge } from '@/components/ui/tag-badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFollows } from '@/hooks/useFollows';
import { useToast } from '@/hooks/use-toast';
import { Profile, Tag } from '@/types';

interface UserTagWithTag {
  id: string;
  tag_id: string;
  tag: Tag;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isFollowing, followUser, unfollowUser, getFollowCounts, loading } = useFollows();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userTags, setUserTags] = useState<UserTagWithTag[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: tagsData } = await supabase
        .from('user_tags')
        .select('id, tag_id, tag:tags(*)')
        .eq('user_id', userId);
      
      if (tagsData) {
        setUserTags(tagsData as unknown as UserTagWithTag[]);
      }

      const counts = await getFollowCounts(userId);
      setFollowCounts(counts);
      
      setLoadingProfile(false);
    };

    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleFollow = async () => {
    if (!userId) return;
    
    if (isFollowing(userId)) {
      const success = await unfollowUser(userId);
      if (success) {
        setFollowCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
        toast({ title: t('profileUnfollowed') });
      }
    } else {
      const success = await followUser(userId);
      if (success) {
        setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast({ title: t('profileFollowing') });
      }
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-muted-foreground">{t('profileNotFound')}</div>
      </div>
    );
  }

  const skillTags = userTags.filter(ut => ut.tag?.category === 'skills');
  const communityTags = userTags.filter(ut => ut.tag?.category === 'communities');
  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 shadow-soft"
        >
          {/* Header with avatar */}
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-2xl font-display font-bold text-center">
              {profile.full_name || t('user')}
            </h1>
            
            {profile.location && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}

            {/* Follow stats */}
            <div className="flex gap-6 mt-4">
              <button 
                onClick={() => navigate(`/profile/${userId}/followers`)}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <p className="text-xl font-bold">{followCounts.followers}</p>
                <p className="text-sm text-muted-foreground">{t('profileFollowers')}</p>
              </button>
              <button 
                onClick={() => navigate(`/profile/${userId}/following`)}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <p className="text-xl font-bold">{followCounts.following}</p>
                <p className="text-sm text-muted-foreground">{t('profileFollowingLabel')}</p>
              </button>
            </div>

            {/* Follow button */}
            {user && !isOwnProfile && (
              <Button
                onClick={handleFollow}
                variant={isFollowing(userId!) ? "outline" : "default"}
                className="mt-4"
                disabled={loading}
              >
                {isFollowing(userId!) ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    {t('profileUnfollow')}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('profileFollow')}
                  </>
                )}
              </Button>
            )}

            {isOwnProfile && (
              <Button
                onClick={() => navigate('/profile/edit')}
                variant="outline"
                className="mt-4"
              >
                {t('edit')}
              </Button>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t('profileBio')}</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {skillTags.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t('profileSkillsTitle')}</h3>
              <div className="flex flex-wrap gap-2">
                {skillTags.map(ut => (
                  <TagBadge key={ut.id} name={ut.tag.name} category="skills" />
                ))}
              </div>
            </div>
          )}

          {/* Communities */}
          {communityTags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">{t('profileCommunitiesTitle')}</h3>
              <div className="flex flex-wrap gap-2">
                {communityTags.map(ut => (
                  <TagBadge key={ut.id} name={ut.tag.name} category="communities" />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PublicProfile;
