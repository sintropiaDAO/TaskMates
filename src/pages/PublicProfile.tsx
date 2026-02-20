import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { ProfilePersonalSection } from '@/components/profile/ProfilePersonalSection';
import { ProfileTagsSection } from '@/components/profile/ProfileTagsSection';
import { ProfileStatsSection } from '@/components/profile/ProfileStatsSection';
import { TestimonialsSection } from '@/components/profile/TestimonialsSection';
import { BadgeBanner } from '@/components/badges/BadgeBanner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFollows } from '@/hooks/useFollows';
import { useToast } from '@/hooks/use-toast';
import { Profile, Tag, Task } from '@/types';

interface UserTagWithTag {
  id: string;
  tag_id: string;
  tag: Tag;
}

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'collaboration' | 'follow';
  description: string;
  taskTitle?: string;
  created_at: string;
  taskId?: string;
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
  const [currentUserTags, setCurrentUserTags] = useState<UserTagWithTag[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [taskStats, setTaskStats] = useState({ created: 0, completed: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

      // Fetch current user's tags for comparison
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

      // Fetch task statistics
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('created_by', userId);

      if (tasksData) {
        setTaskStats({
          created: tasksData.length,
          completed: tasksData.filter(t => t.status === 'completed').length
        });
      }

      // Fetch recent activities
      const activitiesResult: ActivityItem[] = [];

      // Recent tasks created
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select('id, title, created_at, status')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentTasks) {
        recentTasks.forEach(task => {
          activitiesResult.push({
            id: `task-${task.id}`,
            type: task.status === 'completed' ? 'task_completed' : 'task_created',
            description: task.status === 'completed' 
              ? `${t('completedTask')}: "${task.title}"`
              : `${t('createdTask')}: "${task.title}"`,
            taskTitle: task.title,
            created_at: task.created_at || '',
            taskId: task.id
          });
        });
      }

      // Recent collaborations
      const { data: recentCollabs } = await supabase
        .from('task_collaborators')
        .select('id, created_at, task:tasks(id, title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentCollabs) {
        recentCollabs.forEach(collab => {
          const task = collab.task as { id: string; title: string } | null;
          const taskTitle = task?.title || '';
          if (taskTitle) {
            activitiesResult.push({
              id: `collab-${collab.id}`,
              type: 'collaboration',
              description: `${t('joinedTask')}: "${taskTitle}"`,
              taskTitle,
              created_at: collab.created_at || '',
              taskId: task?.id
            });
          }
        });
      }

      // Sort by date and limit
      activitiesResult.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setActivities(activitiesResult.slice(0, 5));
      
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
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <div className="animate-pulse text-primary text-center">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
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
        <Button
          variant="ghost"
          type="button"
          onClick={handleBack}
          className="mb-2"
        >
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




          {/* Badge Banner */}
          <BadgeBanner targetUserId={userId!} />

          {/* Section 2: Tags */}
          <ProfileTagsSection
            userTags={userTags}
            currentUserTags={currentUserTags}
            isOwnProfile={isOwnProfile}
            isLoggedIn={!!user}
          />

          {/* Section 3: Reputation, Stats & Activity */}
          <ProfileStatsSection
            userId={userId!}
            taskStats={taskStats}
            activities={activities}
            onTaskClick={setSelectedTask}
          />

          {/* Section 4: Testimonials */}
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
      />
    </div>
  );
};

export default PublicProfile;
