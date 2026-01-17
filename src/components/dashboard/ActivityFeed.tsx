import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ListTodo, CheckCircle, UserPlus, Users, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'collaborator_completed' | 'collaboration' | 'new_follow';
  userId: string;
  userName: string;
  userAvatar: string | null;
  description: string;
  taskId?: string;
  taskTitle?: string;
  targetUserId?: string;
  targetUserName?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  followingIds: string[];
  currentUserId?: string;
  onTaskClick?: (taskId: string) => void;
}

export function ActivityFeed({ followingIds, currentUserId, onTaskClick }: ActivityFeedProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const dateLocale = language === 'pt' ? pt : enUS;

  useEffect(() => {
    // Include current user's ID along with following IDs
    const allUserIds = currentUserId 
      ? [...new Set([...followingIds, currentUserId])]
      : followingIds;

    if (allUserIds.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      const activitiesResult: ActivityItem[] = [];

      // Fetch profiles for all users (following + current user)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch recent tasks created by all users
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select('id, title, created_at, status, created_by, updated_at')
        .in('created_by', allUserIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentTasks) {
        recentTasks.forEach(task => {
          const profile = profileMap.get(task.created_by);
          if (profile) {
            // For completed tasks, use updated_at as the completion date
            activitiesResult.push({
              id: `task-${task.id}`,
              type: task.status === 'completed' ? 'task_completed' : 'task_created',
              userId: task.created_by,
              userName: profile.full_name || t('user'),
              userAvatar: profile.avatar_url,
              description: task.status === 'completed' 
                ? t('activityCompletedTask')
                : t('activityCreatedTask'),
              taskId: task.id,
              taskTitle: task.title,
              createdAt: task.status === 'completed' ? (task.updated_at || task.created_at || '') : (task.created_at || '')
            });
          }
        });
      }

      // Fetch recent collaborations by all users (including task completions by collaborators)
      const { data: recentCollabs } = await supabase
        .from('task_collaborators')
        .select('id, created_at, completed_at, user_id, status, approval_status, completion_proof_url, task:tasks(id, title, status)')
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentCollabs) {
        recentCollabs.forEach(collab => {
          const profile = profileMap.get(collab.user_id);
          const task = collab.task as any;
          if (profile && task) {
            // If collaborator submitted completion proof or task is completed, show as collaborator completion
            if (collab.completion_proof_url && collab.completed_at) {
              activitiesResult.push({
                id: `collab-complete-${collab.id}`,
                type: 'collaborator_completed',
                userId: collab.user_id,
                userName: profile.full_name || t('user'),
                userAvatar: profile.avatar_url,
                description: t('activityCollaboratorCompleted'),
                taskId: task.id,
                taskTitle: task.title,
                createdAt: collab.completed_at
              });
            }
            
            // Show collaboration joining activity
            activitiesResult.push({
              id: `collab-${collab.id}`,
              type: 'collaboration',
              userId: collab.user_id,
              userName: profile.full_name || t('user'),
              userAvatar: profile.avatar_url,
              description: t('activityJoinedTask'),
              taskId: task.id,
              taskTitle: task.title,
              createdAt: collab.created_at || ''
            });
          }
        });
      }

      // Fetch recent follows by all users
      const { data: recentFollows } = await supabase
        .from('follows')
        .select('id, created_at, follower_id, following_id')
        .in('follower_id', allUserIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentFollows) {
        // Get profiles for target users
        const targetIds = recentFollows.map(f => f.following_id);
        const { data: targetProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', targetIds);

        const targetProfileMap = new Map(targetProfiles?.map(p => [p.id, p]) || []);

        recentFollows.forEach(follow => {
          const profile = profileMap.get(follow.follower_id);
          const targetProfile = targetProfileMap.get(follow.following_id);
          if (profile && targetProfile) {
            activitiesResult.push({
              id: `follow-${follow.id}`,
              type: 'new_follow',
              userId: follow.follower_id,
              userName: profile.full_name || t('user'),
              userAvatar: profile.avatar_url,
              description: t('activityStartedFollowing'),
              targetUserId: follow.following_id,
              targetUserName: targetProfile.full_name || t('user'),
              createdAt: follow.created_at || ''
            });
          }
        });
      }

      // Sort all activities by date
      activitiesResult.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setActivities(activitiesResult.slice(0, 20));
      setLoading(false);
    };

    fetchActivities();
  }, [followingIds, currentUserId, t]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_created':
        return <ListTodo className="w-4 h-4 text-blue-500" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'collaborator_completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'collaboration':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'new_follow':
        return <UserPlus className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="animate-pulse text-primary">{t('loading')}</div>
      </div>
    );
  }

  if (followingIds.length === 0 && !currentUserId) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('activityNoFollowing')}</h3>
        <p className="text-muted-foreground">{t('activityNoFollowingDescription')}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('activityEmpty')}</h3>
        <p className="text-muted-foreground">{t('activityEmptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{t('activityFeedTitle')}</h3>
      </div>

      <div className="divide-y divide-border/30">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar 
                className="w-10 h-10 cursor-pointer"
                onClick={() => navigate(`/profile/${activity.userId}`)}
              >
                <AvatarImage src={activity.userAvatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {activity.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(`/profile/${activity.userId}`)}
                  >
                    {activity.userName}
                  </span>
                  {getActivityIcon(activity.type)}
                  <span className="text-muted-foreground">{activity.description}</span>
                </div>

                {activity.taskTitle && activity.taskId && (
                  <p 
                    className="text-sm text-primary mt-1 truncate cursor-pointer hover:underline"
                    onClick={() => onTaskClick?.(activity.taskId!)}
                  >
                    "{activity.taskTitle}"
                  </p>
                )}

                {activity.targetUserName && (
                  <p 
                    className="text-sm text-primary mt-1 cursor-pointer hover:underline"
                    onClick={() => navigate(`/profile/${activity.targetUserId}`)}
                  >
                    {activity.targetUserName}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                    locale: dateLocale
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}