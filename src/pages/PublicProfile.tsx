import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldBan, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ProfilePersonalSection } from '@/components/profile/ProfilePersonalSection';
import { ProfileTagsSection } from '@/components/profile/ProfileTagsSection';
import { ProfileReportSections } from '@/components/profile/ProfileReportSections';
import { ProfileMediaSection } from '@/components/profile/ProfileMediaSection';
import { TestimonialsSection } from '@/components/profile/TestimonialsSection';
import { BadgeBanner } from '@/components/badges/BadgeBanner';
import { FlagReportButton } from '@/components/reports/FlagReportButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFollows } from '@/hooks/useFollows';
import { useBlocks } from '@/hooks/useBlocks';
import { useTasks } from '@/hooks/useTasks';
import { useReputation } from '@/hooks/useReputation';
import { useToast } from '@/hooks/use-toast';
import { Profile, Tag, Task } from '@/types';

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
  const { isBlocked, blockUser, unblockUser, checkIfBlockedBy, loading: blockLoading } = useBlocks();
  const { completeTask, deleteTask, updateTask, refreshTasks } = useTasks();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userTags, setUserTags] = useState<UserTagWithTag[]>([]);
  const [currentUserTags, setCurrentUserTags] = useState<UserTagWithTag[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [blockedByTarget, setBlockedByTarget] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoadingProfile(true);

      if (user && user.id !== userId) {
        const blocked = await checkIfBlockedBy(userId);
        if (blocked) {
          setBlockedByTarget(true);
          setLoadingProfile(false);
          return;
        }
        setBlockedByTarget(false);
      }
      
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

      if (user && user.id !== userId) {
        const { data: currentUserTagsData } = await supabase
          .from('user_tags')
          .select('id, tag_id, tag:tags(*)')
          .eq('user_id', user.id);
        
        if (currentUserTagsData) {
          setCurrentUserTags(currentUserTagsData as unknown as UserTagWithTag[]);
        }
      }

      const counts = await getFollowCounts(userId);
      setFollowCounts(counts);
      
      setLoadingProfile(false);
    };

    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.id]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleFollow = async () => {
    if (!userId) return;
    
    if (isFollowing(userId)) {
      const success = await unfollowUser(userId);
      if (success) {
        setFollowCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
        toast({ title: t('profileUnfollowed') });
      }
    } else {
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      const followerName = currentUserProfile?.full_name || t('user');
      const success = await followUser(userId, followerName);
      if (success) {
        setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
        toast({ title: t('profileFollowing') });
      }
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" type="button" onClick={handleBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <div className="animate-pulse text-primary text-center">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (blockedByTarget) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" type="button" onClick={handleBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <div className="glass rounded-2xl p-8 text-center">
            <ShieldBan className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('profileBlockedMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" type="button" onClick={handleBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">{t('profileNotFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" type="button" onClick={handleBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        <div className="space-y-6">
          {/* Section 1: Personal Info */}
          <ProfilePersonalSection
            profile={profile}
            userId={userId!}
            followCounts={followCounts}
            isOwnProfile={isOwnProfile}
            isLoggedIn={!!user}
            isFollowing={userId ? isFollowing(userId) : false}
            loading={loading}
            onFollow={handleFollow}
          />
          {!isOwnProfile && userId && (
            <div className="flex items-center justify-end gap-2 -mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isBlocked(userId)) {
                    const doUnblock = async () => {
                      const success = await unblockUser(userId);
                      if (success) toast({ title: t('unblockSuccess') });
                    };
                    doUnblock();
                  } else {
                    setShowBlockConfirm(true);
                  }
                }}
                disabled={blockLoading}
                className="text-muted-foreground hover:text-destructive text-xs gap-1"
              >
                {isBlocked(userId) ? (
                  <><ShieldCheck className="w-3.5 h-3.5" />{t('unblockUser')}</>
                ) : (
                  <><ShieldBan className="w-3.5 h-3.5" />{t('blockUser')}</>
                )}
              </Button>
              <FlagReportButton entityType="user" entityId={userId} entityTitle={profile.full_name || ''} />
            </div>
          )}

          {/* Badge Banner */}
          <BadgeBanner targetUserId={userId!} />

          {/* Section 2: Tags */}
          <ProfileTagsSection
            userTags={userTags}
            currentUserTags={currentUserTags}
            isOwnProfile={isOwnProfile}
            isLoggedIn={!!user}
          />

          {/* Section 3: Media Gallery (replaces Task Stats) */}
          <ProfileMediaSection userId={userId!} onTaskClick={setSelectedTask} />

          {/* Section 4: Report Sections (Coins, Chart, Ratings) */}
          <ProfileReportSections userId={userId!} isOwnProfile={isOwnProfile} />

          {/* Section 5: Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
          >
            <ActivityFeed
              followingIds={[]}
              currentUserId={userId!}
              onTaskClick={(taskId) => {
                // Fetch task for modal
                supabase.from('tasks').select('*').eq('id', taskId).single().then(({ data }) => {
                  if (data) setSelectedTask(data as Task);
                });
              }}
            />
          </motion.div>

          {/* Section 5: Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
          >
            <TestimonialsSection profileUserId={userId!} isOwnProfile={isOwnProfile} />
          </motion.div>
        </div>
      </div>

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={async (taskId, proofUrl, proofType) => {
          const result = await completeTask(taskId, proofUrl, proofType);
          return result;
        }}
        onRefresh={refreshTasks}
        onEdit={(task) => {
          setSelectedTask(null);
          navigate('/dashboard');
        }}
        onDelete={async (taskId) => {
          const success = await deleteTask(taskId);
          if (success) {
            setSelectedTask(null);
          }
          return success;
        }}
        onOpenRelatedTask={(task) => setSelectedTask(task)}
      />

      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('blockConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('blockConfirmMessage')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!userId) return;
                const success = await blockUser(userId);
                if (success) {
                  toast({ title: t('blockSuccess') });
                  setFollowCounts(prev => ({
                    ...prev,
                    followers: Math.max(0, prev.followers - (isFollowing(userId) ? 1 : 0))
                  }));
                }
                setShowBlockConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublicProfile;
