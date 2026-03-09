import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Poll, PollOption, PollVote, Tag, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function usePolls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    setLoading(true);
    const { data: pollsData, error } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !pollsData) {
      console.error('Error fetching polls:', error);
      setLoading(false);
      return;
    }

    const pollIds = pollsData.map(p => p.id);
    const creatorIds = [...new Set(pollsData.map(p => p.created_by))];

    const [tagsResult, profilesResult, optionsResult, votesResult] = await Promise.all([
      supabase.from('poll_tags').select('poll_id, tag:tags(*)').in('poll_id', pollIds),
      supabase.from('public_profiles').select('*').in('id', creatorIds),
      supabase.from('poll_options').select('*').in('poll_id', pollIds),
      supabase.from('poll_votes').select('*').in('poll_id', pollIds),
    ]);

    const tagsByPoll: Record<string, Tag[]> = {};
    tagsResult.data?.forEach((pt: any) => {
      if (!tagsByPoll[pt.poll_id]) tagsByPoll[pt.poll_id] = [];
      if (pt.tag) tagsByPoll[pt.poll_id].push(pt.tag as Tag);
    });

    const profilesMap: Record<string, Profile> = {};
    profilesResult.data?.forEach(p => {
      profilesMap[p.id!] = p as unknown as Profile;
    });

    const optionsByPoll: Record<string, PollOption[]> = {};
    optionsResult.data?.forEach(o => {
      if (!optionsByPoll[o.poll_id]) optionsByPoll[o.poll_id] = [];
      optionsByPoll[o.poll_id].push(o as PollOption);
    });

    const votesByPoll: Record<string, PollVote[]> = {};
    votesResult.data?.forEach(v => {
      if (!votesByPoll[v.poll_id]) votesByPoll[v.poll_id] = [];
      votesByPoll[v.poll_id].push(v as PollVote);
    });

    const enriched = pollsData.map(p => ({
      ...p,
      tags: tagsByPoll[p.id] || [],
      creator: profilesMap[p.created_by],
      options: optionsByPoll[p.id] || [],
      votes: votesByPoll[p.id] || [],
    })) as Poll[];

    setPolls(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [user?.id, fetchPolls]);

  const createPoll = async (
    title: string,
    description: string,
    options: string[],
    tagIds: string[],
    deadline?: string,
    allowNewOptions: boolean = true,
    taskId?: string
  ) => {
    if (!user) return null;

    const { data: poll, error } = await supabase
      .from('polls')
      .insert({
        title,
        description,
        deadline: deadline || null,
        allow_new_options: allowNewOptions,
        created_by: user.id,
        task_id: taskId || null,
      })
      .select()
      .single();

    if (error || !poll) return null;

    // Insert options
    if (options.length > 0) {
      await supabase.from('poll_options').insert(
        options.map(label => ({ poll_id: poll.id, label, created_by: user.id }))
      );
    }

    // Insert tags
    if (tagIds.length > 0) {
      await supabase.from('poll_tags').insert(
        tagIds.map(tagId => ({ poll_id: poll.id, tag_id: tagId }))
      );
    }

    await fetchPolls();
    return poll as Poll;
  };

  const vote = async (pollId: string, optionId: string) => {
    if (!user) return false;

    // Check if user is verified
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!(profileData as any)?.is_verified) {
      return false; // Will be handled by UI toast
    }

    // Check existing vote
    const { data: existing } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Update vote
      await supabase.from('poll_votes').update({ option_id: optionId }).eq('id', existing.id);
    } else {
      await supabase.from('poll_votes').insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id,
      });
    }

    await fetchPolls();
    return true;
  };

  const addOption = async (pollId: string, label: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('poll_options')
      .insert({ poll_id: pollId, label, created_by: user.id })
      .select()
      .single();
    if (!error) {
      await fetchPolls();
      return data as PollOption;
    }
    return null;
  };

  const updatePoll = async (
    pollId: string,
    title: string,
    description: string,
    tagIds: string[],
    deadline?: string,
    allowNewOptions: boolean = true
  ) => {
    if (!user) return false;

    const { error } = await supabase
      .from('polls')
      .update({
        title,
        description,
        deadline: deadline || null,
        allow_new_options: allowNewOptions,
      })
      .eq('id', pollId);

    if (error) return false;

    // Update tags
    await supabase.from('poll_tags').delete().eq('poll_id', pollId);
    if (tagIds.length > 0) {
      await supabase.from('poll_tags').insert(
        tagIds.map(tagId => ({ poll_id: pollId, tag_id: tagId }))
      );
    }

    await fetchPolls();
    return true;
  };

  const deletePoll = async (pollId: string) => {
    if (!user) return false;
    const { error } = await supabase.from('polls').delete().eq('id', pollId);
    if (!error) {
      await fetchPolls();
      return true;
    }
    return false;
  };

  const removeVote = async (pollId: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    if (!error) {
      await fetchPolls();
      return true;
    }
    return false;
  };

  return {
    polls,
    loading,
    createPoll,
    updatePoll,
    vote,
    addOption,
    deletePoll,
    removeVote,
    refreshPolls: fetchPolls,
  };
}
