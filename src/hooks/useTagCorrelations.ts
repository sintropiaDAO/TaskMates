import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tag } from '@/types';

interface TagCorrelation {
  id: string;
  tag_id_1: string;
  tag_id_2: string;
  correlation_score: number;
  correlation_type: string;
}

/**
 * Smart tag correlation system that groups tags by theme similarity.
 * Uses co-occurrence data (tags used together by users and in tasks)
 * to calculate correlation scores.
 */
export function useTagCorrelations() {
  const [correlations, setCorrelations] = useState<TagCorrelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorrelations();
  }, []);

  const fetchCorrelations = async () => {
    const { data } = await supabase
      .from('tag_correlations')
      .select('*')
      .order('correlation_score', { ascending: false });

    if (data) {
      setCorrelations(data as TagCorrelation[]);
    }
    setLoading(false);
  };

  /**
   * Recalculate correlations based on co-occurrence:
   * - Tags used together by the same user (user_tags)
   * - Tags used together in the same task (task_tags)
   */
  const recalculateCorrelations = async () => {
    try {
      // Fetch all user_tags grouped by user
      const { data: userTags } = await supabase
        .from('user_tags')
        .select('user_id, tag_id');

      // Fetch all task_tags grouped by task
      const { data: taskTags } = await supabase
        .from('task_tags')
        .select('task_id, tag_id');

      const coOccurrenceMap = new Map<string, number>();

      // Count co-occurrences in user profiles
      if (userTags) {
        const userTagsGrouped = new Map<string, string[]>();
        userTags.forEach(ut => {
          if (!userTagsGrouped.has(ut.user_id)) userTagsGrouped.set(ut.user_id, []);
          userTagsGrouped.get(ut.user_id)!.push(ut.tag_id);
        });

        userTagsGrouped.forEach(tagIds => {
          for (let i = 0; i < tagIds.length; i++) {
            for (let j = i + 1; j < tagIds.length; j++) {
              const key = [tagIds[i], tagIds[j]].sort().join('|');
              coOccurrenceMap.set(key, (coOccurrenceMap.get(key) || 0) + 2); // Weight user co-occurrence higher
            }
          }
        });
      }

      // Count co-occurrences in tasks
      if (taskTags) {
        const taskTagsGrouped = new Map<string, string[]>();
        taskTags.forEach(tt => {
          if (!taskTagsGrouped.has(tt.task_id)) taskTagsGrouped.set(tt.task_id, []);
          taskTagsGrouped.get(tt.task_id)!.push(tt.tag_id);
        });

        taskTagsGrouped.forEach(tagIds => {
          for (let i = 0; i < tagIds.length; i++) {
            for (let j = i + 1; j < tagIds.length; j++) {
              const key = [tagIds[i], tagIds[j]].sort().join('|');
              coOccurrenceMap.set(key, (coOccurrenceMap.get(key) || 0) + 1);
            }
          }
        });
      }

      // Upsert correlations
      const entries = Array.from(coOccurrenceMap.entries())
        .filter(([, score]) => score >= 1)
        .map(([key, score]) => {
          const [tag_id_1, tag_id_2] = key.split('|');
          return { tag_id_1, tag_id_2, correlation_score: score, correlation_type: 'co_occurrence' };
        });

      if (entries.length > 0) {
        // Delete old correlations and insert new
        await supabase.from('tag_correlations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert in batches of 100
        for (let i = 0; i < entries.length; i += 100) {
          const batch = entries.slice(i, i + 100);
          await supabase.from('tag_correlations').insert(batch);
        }
      }

      await fetchCorrelations();
    } catch (error) {
      console.error('Error recalculating correlations:', error);
    }
  };

  /**
   * Get correlated tags for a given tag, sorted by score
   */
  const getCorrelatedTags = (tagId: string, limit = 10): { tagId: string; score: number }[] => {
    const related = correlations
      .filter(c => c.tag_id_1 === tagId || c.tag_id_2 === tagId)
      .map(c => ({
        tagId: c.tag_id_1 === tagId ? c.tag_id_2 : c.tag_id_1,
        score: Number(c.correlation_score)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return related;
  };

  /**
   * Get recommended tags based on a user's current tag set.
   * Finds tags that are correlated to the user's tags but not yet selected.
   */
  const getRecommendedTags = (userTagIds: string[], allTags: Tag[], limit = 10): Tag[] => {
    if (userTagIds.length === 0) return [];

    const scoreMap = new Map<string, number>();

    userTagIds.forEach(userTagId => {
      const correlated = getCorrelatedTags(userTagId, 20);
      correlated.forEach(({ tagId, score }) => {
        if (!userTagIds.includes(tagId)) {
          scoreMap.set(tagId, (scoreMap.get(tagId) || 0) + score);
        }
      });
    });

    return Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tagId]) => allTags.find(t => t.id === tagId))
      .filter(Boolean) as Tag[];
  };

  /**
   * Group tags into thematic clusters based on correlations
   */
  const getTagClusters = (tags: Tag[], minScore = 2): Tag[][] => {
    const visited = new Set<string>();
    const clusters: Tag[][] = [];
    const tagMap = new Map(tags.map(t => [t.id, t]));

    const dfs = (tagId: string, cluster: Tag[]) => {
      if (visited.has(tagId)) return;
      visited.add(tagId);
      const tag = tagMap.get(tagId);
      if (tag) cluster.push(tag);

      const correlated = getCorrelatedTags(tagId, 20)
        .filter(c => c.score >= minScore && tagMap.has(c.tagId));
      
      correlated.forEach(({ tagId: relatedId }) => {
        if (!visited.has(relatedId)) {
          dfs(relatedId, cluster);
        }
      });
    };

    tags.forEach(tag => {
      if (!visited.has(tag.id)) {
        const cluster: Tag[] = [];
        dfs(tag.id, cluster);
        if (cluster.length > 0) clusters.push(cluster);
      }
    });

    return clusters.sort((a, b) => b.length - a.length);
  };

  return {
    correlations,
    loading,
    getCorrelatedTags,
    getRecommendedTags,
    getTagClusters,
    recalculateCorrelations,
    refreshCorrelations: fetchCorrelations,
  };
}
