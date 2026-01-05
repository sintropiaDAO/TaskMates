import { motion } from 'framer-motion';
import { MapPin, UserPlus, UserMinus, Instagram, Twitter, Linkedin, Github, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile, SocialLinks } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface ProfilePersonalSectionProps {
  profile: Profile;
  userId: string;
  followCounts: { followers: number; following: number };
  isOwnProfile: boolean;
  isLoggedIn: boolean;
  isFollowing: boolean;
  loading: boolean;
  onFollow: () => void;
}

const socialIcons = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
  website: Globe,
};

const socialUrls = {
  instagram: 'https://instagram.com/',
  twitter: 'https://twitter.com/',
  linkedin: 'https://linkedin.com/in/',
  github: 'https://github.com/',
  website: '',
};

export function ProfilePersonalSection({
  profile,
  userId,
  followCounts,
  isOwnProfile,
  isLoggedIn,
  isFollowing,
  loading,
  onFollow,
}: ProfilePersonalSectionProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const socialLinks = profile.social_links as SocialLinks | null;
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some(v => v && v.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl p-8 border border-border/50 shadow-soft"
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <Avatar className="w-28 h-28 mb-4 ring-4 ring-primary/20 ring-offset-2 ring-offset-background">
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
          <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        {/* Name */}
        <h1 className="text-2xl font-display font-bold">
          {profile.full_name || t('user')}
        </h1>
        
        {/* Location */}
        {profile.location && (
          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <span>{profile.location}</span>
          </div>
        )}

        {/* Follow stats */}
        <div className="flex gap-8 mt-4">
          <button 
            onClick={() => navigate(`/profile/${userId}/followers`)}
            className="text-center hover:opacity-80 transition-opacity group"
          >
            <p className="text-2xl font-bold group-hover:text-primary transition-colors">{followCounts.followers}</p>
            <p className="text-sm text-muted-foreground">{t('profileFollowers')}</p>
          </button>
          <button 
            onClick={() => navigate(`/profile/${userId}/following`)}
            className="text-center hover:opacity-80 transition-opacity group"
          >
            <p className="text-2xl font-bold group-hover:text-primary transition-colors">{followCounts.following}</p>
            <p className="text-sm text-muted-foreground">{t('profileFollowingLabel')}</p>
          </button>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-muted-foreground mt-4 max-w-md">{profile.bio}</p>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div className="flex gap-3 mt-4">
            {Object.entries(socialLinks || {}).map(([key, value]) => {
              if (!value || !value.trim()) return null;
              const Icon = socialIcons[key as keyof typeof socialIcons];
              if (!Icon) return null;
              
              const baseUrl = socialUrls[key as keyof typeof socialUrls];
              const href = key === 'website' 
                ? (value.startsWith('http') ? value : `https://${value}`)
                : `${baseUrl}${value.replace(/^@/, '')}`;
              
              return (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  title={key.charAt(0).toUpperCase() + key.slice(1)}
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6">
          {isLoggedIn && !isOwnProfile && (
            <Button
              onClick={onFollow}
              variant={isFollowing ? "outline" : "default"}
              disabled={loading}
              className="min-w-[140px]"
            >
              {isFollowing ? (
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
            >
              {t('edit')}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
