import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Report {
  id: string;
  reporter_id: string;
  entity_type: string;
  entity_id: string;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  reporter_name?: string | null;
  reporter_avatar?: string | null;
  likes: number;
  dislikes: number;
  userLike: 'like' | 'dislike' | null;
}

export function useReports(entityType: string, entityId: string) {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!entityId) return;
    const { count: c } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
    setCount(c || 0);
  }, [entityType, entityId]);

  const fetchReports = useCallback(async () => {
    if (!entityId || !user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // Fetch reporter profiles
      const reporterIds = [...new Set(data.filter(r => !r.is_anonymous).map(r => r.reporter_id))];
      let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (reporterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', reporterIds);
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }

      // Fetch likes
      const reportIds = data.map(r => r.id);
      const { data: likesData } = await supabase
        .from('report_likes')
        .select('report_id, like_type, user_id')
        .in('report_id', reportIds);

      const enriched: Report[] = data.map(r => {
        const itemLikes = likesData?.filter(l => l.report_id === r.id) || [];
        const profile = r.is_anonymous ? null : profileMap[r.reporter_id];
        return {
          ...r,
          reporter_name: profile?.full_name || null,
          reporter_avatar: profile?.avatar_url || null,
          likes: itemLikes.filter(l => l.like_type === 'like').length,
          dislikes: itemLikes.filter(l => l.like_type === 'dislike').length,
          userLike: (itemLikes.find(l => l.user_id === user.id)?.like_type as 'like' | 'dislike') || null,
        };
      });

      setReports(enriched);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const submitReport = async (comment: string, isAnonymous: boolean) => {
    if (!user || !entityId) return false;
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        comment,
        is_anonymous: isAnonymous,
      });
      if (error) throw error;

      // Create notification for entity owner and record -1 MAX_RATING coin
      const ownerId = await notifyEntityOwner(comment, isAnonymous);
      
      // Record REPORT_RECEIVED → -1 MAX_RATING for entity owner
      if (ownerId && ownerId !== user.id) {
        try {
          await supabase.rpc('record_coin_event', {
            _event_id: `REPORT_RECEIVED_${entityType}_${entityId}_${user.id}`,
            _event_type: 'REPORT_RECEIVED',
            _currency_key: 'MAX_RATING',
            _subject_user_id: ownerId,
            _amount: -1,
            _meta: { entity_type: entityType, entity_id: entityId, reporter_id: user.id },
          } as any);
        } catch {}
      }

      await fetchCount();
      await fetchReports();
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      return false;
    }
  };

  const notifyEntityOwner = async (comment: string, isAnonymous: boolean): Promise<string | null> => {
    if (!user) return;
    try {
      let ownerId: string | null = null;
      let entityTitle = '';

      if (entityType === 'task') {
        const { data } = await supabase.from('tasks').select('created_by, title').eq('id', entityId).maybeSingle();
        ownerId = data?.created_by || null;
        entityTitle = data?.title || '';
      } else if (entityType === 'product') {
        const { data } = await supabase.from('products').select('created_by, title').eq('id', entityId).maybeSingle();
        ownerId = data?.created_by || null;
        entityTitle = data?.title || '';
      } else if (entityType === 'poll') {
        const { data } = await supabase.from('polls').select('created_by, title').eq('id', entityId).maybeSingle();
        ownerId = data?.created_by || null;
        entityTitle = data?.title || '';
      } else if (entityType === 'tag') {
        const { data } = await supabase.from('tags').select('created_by, name').eq('id', entityId).maybeSingle();
        ownerId = data?.created_by || null;
        entityTitle = data?.name || '';
      } else if (entityType === 'user') {
        ownerId = entityId;
        const { data } = await supabase.from('profiles').select('full_name').eq('id', entityId).maybeSingle();
        entityTitle = data?.full_name || '';
      }

      if (ownerId && ownerId !== user.id) {
        const typeLabels: Record<string, string> = {
          task: 'tarefa',
          product: 'produto',
          poll: 'enquete',
          tag: 'tag',
          user: 'perfil',
        };
        const message = `🚩 Sua ${typeLabels[entityType] || entityType} "${entityTitle}" recebeu uma denúncia.`;
        
        await supabase.rpc('create_notification', {
          _user_id: ownerId,
          _task_id: entityType === 'task' ? entityId : entityId,
          _type: 'report',
          _message: message,
        });
      }

      // Also notify collaborators for tasks
      if (entityType === 'task') {
        const { data: collabs } = await supabase
          .from('task_collaborators')
          .select('user_id')
          .eq('task_id', entityId)
          .eq('approval_status', 'approved');

        if (collabs) {
          for (const collab of collabs) {
            if (collab.user_id !== user.id && collab.user_id !== ownerId) {
              await supabase.rpc('create_notification', {
                _user_id: collab.user_id,
                _task_id: entityId,
                _type: 'report',
                _message: `🚩 Uma tarefa que você colabora recebeu uma denúncia.`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error notifying entity owner:', error);
    }
  };

  const toggleLike = async (reportId: string, likeType: 'like' | 'dislike') => {
    if (!user) return;
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    try {
      if (report.userLike === likeType) {
        await supabase.from('report_likes').delete().eq('report_id', reportId).eq('user_id', user.id);
      } else if (report.userLike) {
        await supabase.from('report_likes').update({ like_type: likeType }).eq('report_id', reportId).eq('user_id', user.id);
      } else {
        await supabase.from('report_likes').insert({ report_id: reportId, user_id: user.id, like_type: likeType });
      }
      await fetchReports();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('reports').delete().eq('id', reportId).eq('reporter_id', user.id);
      if (error) throw error;
      await fetchCount();
      await fetchReports();
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  };

  return {
    reports,
    count,
    loading,
    submitReport,
    fetchReports,
    toggleLike,
    deleteReport,
  };
}
