import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFollows } from '@/hooks/useFollows';

interface FollowProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
}

const FollowList = () => {
  const { userId, type } = useParams<{ userId: string; type: 'followers' | 'following' }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getFollowers, getFollowing } = useFollows();
  
  const [profiles, setProfiles] = useState<FollowProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const isFollowers = type === 'followers';

  useEffect(() => {
    if (!userId || !type) return;

    const fetchList = async () => {
      setLoading(true);
      const data = isFollowers 
        ? await getFollowers(userId)
        : await getFollowing(userId);
      setProfiles(data as FollowProfile[]);
      setLoading(false);
    };

    fetchList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, type]);

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
          className="glass rounded-2xl p-6 shadow-soft"
        >
          <h1 className="text-2xl font-display font-bold mb-6">
            {isFollowers ? t('profileFollowers') : t('profileFollowingLabel')}
          </h1>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('loading')}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isFollowers ? t('noFollowers') : t('noFollowing')}
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => navigate(`/profile/${profile.id}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {profile.full_name || t('user')}
                    </p>
                    {profile.location && (
                      <p className="text-sm text-muted-foreground truncate">
                        {profile.location}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FollowList;
