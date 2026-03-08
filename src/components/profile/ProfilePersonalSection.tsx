import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, UserPlus, UserMinus, Instagram, Twitter, Linkedin, Github, Globe, BadgeCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { Profile, SocialLinks } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useVouches } from '@/hooks/useVouches';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

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
  const { toast } = useToast();
  const { user, profile: currentUserProfile } = useAuth();
  const { vouchCount, vouchers, hasVouched, loading: vouchLoading, vouchForUser, removeVouch } = useVouches(userId);
  const [showVouchers, setShowVouchers] = useState(false);
  
  const socialLinks = profile.social_links as SocialLinks | null;
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some(v => v && v.trim());
  const isVerified = profile.is_verified === true;

  const handleVouch = async () => {
    if (hasVouched) {
      const success = await removeVouch();
      if (success) {
        toast({ title: t('vouchRemoved') });
      }
      return;
    }
    
    const result = await vouchForUser();
    if (result.success) {
      toast({ title: t('vouchSuccess') });
    } else if (result.error) {
      const errorKey = result.error as keyof typeof t;
      toast({
        title: t('error'),
        description: t(errorKey as any) || result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl p-8 border border-border/50 shadow-soft"
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-28 h-28 mb-4 ring-4 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || ''} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {isVerified && (
              <div className="absolute bottom-3 right-0 bg-background rounded-full p-0.5">
                <BadgeCheck className="w-7 h-7 text-primary fill-background" />
              </div>
            )}
          </div>
          
          {/* Name + Verified Badge */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">
              {profile.full_name || t('user')}
            </h1>
            {isVerified && (
              <button
                onClick={() => setShowVouchers(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                {t('verified')}
              </button>
            )}
          </div>
          
          {/* Username */}
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          
          {/* Location */}
          {profile.location && (
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Verification Progress (only for non-verified users) */}
          {!isVerified && (
            <button
              onClick={() => setShowVouchers(true)}
              className="mt-3 w-full max-w-xs text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {vouchCount} {t('vouchesReceived')}
                </span>
                <span>{t('vouchesNeeded')}</span>
              </div>
              <Progress value={(vouchCount / 3) * 100} className="h-1.5" />
            </button>
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
          <div className="mt-6 flex gap-3 flex-wrap justify-center">
            {isLoggedIn && !isOwnProfile && (
              <>
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
                <StartChatButton userId={userId} variant="outline" />
                
                {/* Vouch Button */}
                {currentUserProfile?.is_verified && !isVerified && (
                  <Button
                    onClick={handleVouch}
                    variant={hasVouched ? "outline" : "secondary"}
                    disabled={vouchLoading}
                    className="gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {hasVouched ? t('removeVouch') : t('vouch')}
                  </Button>
                )}
              </>
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

      {/* Vouchers Dialog */}
      <Dialog open={showVouchers} onOpenChange={setShowVouchers}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t('vouchesReceived')} ({vouchCount})
            </DialogTitle>
          </DialogHeader>
          
          {/* Admin verification indicator */}
          {isVerified && vouchCount < 3 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">{t('verifiedByAdmin')}</p>
            </div>
          )}

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {vouchers.length === 0 && !(isVerified && vouchCount < 3) ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noVouchesYet')}
              </p>
            ) : (
              vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setShowVouchers(false);
                    navigate(`/profile/${voucher.id}`);
                  }}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={voucher.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {voucher.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{voucher.full_name || t('anonymous')}</p>
                    <p className="text-xs text-muted-foreground">@{voucher.username}</p>
                  </div>
                  <BadgeCheck className="w-4 h-4 text-primary ml-auto" />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
