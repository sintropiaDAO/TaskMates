import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tag } from '@/types';

interface TagUsageStats {
  tagId: string;
  userCount: number;
  taskCount: number;
  totalUsage: number;
}

export function useTagUsage() {
  const [usageStats, setUsageStats] = useState<TagUsageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsageStats = async () => {
      try {
        // Fetch user_tags counts
        const { data: userTagsData } = await supabase
          .from('user_tags')
          .select('tag_id');

        // Fetch task_tags counts
        const { data: taskTagsData } = await supabase
          .from('task_tags')
          .select('tag_id');

        // Count occurrences
        const userCounts: Record<string, number> = {};
        const taskCounts: Record<string, number> = {};

        userTagsData?.forEach(ut => {
          userCounts[ut.tag_id] = (userCounts[ut.tag_id] || 0) + 1;
        });

        taskTagsData?.forEach(tt => {
          taskCounts[tt.tag_id] = (taskCounts[tt.tag_id] || 0) + 1;
        });

        // Combine all tag IDs
        const allTagIds = new Set([
          ...Object.keys(userCounts),
          ...Object.keys(taskCounts)
        ]);

        const stats: TagUsageStats[] = Array.from(allTagIds).map(tagId => ({
          tagId,
          userCount: userCounts[tagId] || 0,
          taskCount: taskCounts[tagId] || 0,
          totalUsage: (userCounts[tagId] || 0) + (taskCounts[tagId] || 0)
        }));

        // Sort by total usage
        stats.sort((a, b) => b.totalUsage - a.totalUsage);
        setUsageStats(stats);
      } catch (error) {
        console.error('Error fetching tag usage stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageStats();
  }, []);

  /**
   * Sort tags by usage (most used first)
   */
  const sortTagsByUsage = (tags: Tag[]): Tag[] => {
    const usageMap = new Map(usageStats.map(s => [s.tagId, s.totalUsage]));
    
    return [...tags].sort((a, b) => {
      const usageA = usageMap.get(a.id) || 0;
      const usageB = usageMap.get(b.id) || 0;
      return usageB - usageA;
    });
  };

  /**
   * Get most popular tags for a category
   */
  const getMostPopularTags = (tags: Tag[], limit: number): Tag[] => {
    return sortTagsByUsage(tags).slice(0, limit);
  };

  /**
   * Get usage count for a specific tag
   */
  const getTagUsageCount = (tagId: string): number => {
    const stat = usageStats.find(s => s.tagId === tagId);
    return stat?.totalUsage || 0;
  };

  return {
    usageStats,
    loading,
    sortTagsByUsage,
    getMostPopularTags,
    getTagUsageCount
  };
}
