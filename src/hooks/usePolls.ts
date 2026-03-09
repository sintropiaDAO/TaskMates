import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Poll, PollOption, PollVote, Tag, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export interface PollHistoryEntry {
  id: string;
  poll_id: string;
  user_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

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

  const logHistory = async (pollId: string, action: string, fieldChanged?: string, oldValue?: string, newValue?: string) => {
    if (!user) return;
    await supabase.from('poll_history' as any).insert({
      poll_id: pollId,
      user_id: user.id,
      action,
      field_changed: fieldChanged || null,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
  };

  const fetchPollHistory = async (pollId: string): Promise<PollHistoryEntry[]> => {
    const { data, error } = await supabase
      .from('poll_history' as any)
      .select('*')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const userIds = [...new Set((data as any[]).map((h: any) => h.user_id))];
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    profiles?.forEach((p: any) => { profileMap[p.id] = p; });

    return (data as any[]).map((h: any) => ({ ...h, profile: profileMap[h.user_id] }));
  };

  const createPoll = async (
    title: string,
    description: string,
    options: string[],
    tagIds: string[],
    deadline?: string,
    allowNewOptions: boolean = true,
    taskId?: string,
    minQuorum?: number | null
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
        min_quorum: minQuorum || null,
      } as any)
      .select()
      .single();

    if (error || !poll) return null;

    if (options.length > 0) {
      await supabase.from('poll_options').insert(
        options.map(label => ({ poll_id: poll.id, label, created_by: user.id }))
      );
    }

    if (tagIds.length > 0) {
      await supabase.from('poll_tags').insert(
        tagIds.map(tagId => ({ poll_id: poll.id, tag_id: tagId }))
      );
    }

    await logHistory(poll.id, 'created', undefined, undefined, title);
    await fetchPolls();
    return poll as Poll;
  };

  const updatePoll = async (
    pollId: string,
    title: string,
    description: string,
    tagIds: string[],
    deadline?: string,
    allowNewOptions?: boolean,
    minQuorum?: number | null
  ) => {
    if (!user) return false;

    const currentPoll = polls.find(p => p.id === pollId);

    const { error } = await supabase
      .from('polls')
      .update({
        title,
        description,
        deadline: deadline || null,
        allow_new_options: allowNewOptions,
        min_quorum: minQuorum || null,
      } as any)
      .eq('id', pollId);

    if (error) return false;

    // Update tags
    await supabase.from('poll_tags').delete().eq('poll_id', pollId);
    if (tagIds.length > 0) {
      await supabase.from('poll_tags').insert(
        tagIds.map(tagId => ({ poll_id: pollId, tag_id: tagId }))
      );
    }

    // Log changes
    if (currentPoll?.title !== title) {
      await logHistory(pollId, 'updated', 'title', currentPoll?.title, title);
    }
    if (currentPoll?.description !== description) {
      await logHistory(pollId, 'updated', 'description', currentPoll?.description || '', description);
    }
    if (currentPoll?.deadline !== deadline) {
      await logHistory(pollId, 'updated', 'deadline', currentPoll?.deadline || '', deadline || '');
    }

    await fetchPolls();
    return true;
  };

  const vote = async (pollId: string, optionId: string) => {
    if (!user) return false;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!(profileData as any)?.is_verified) {
      return false;
    }

    const { data: existing } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
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
      await logHistory(pollId, 'option_added', 'option', undefined, label);
      await fetchPolls();
      return data as PollOption;
    }
    return null;
  };

  const deleteOption = async (pollId: string, optionId: string, optionLabel: string) => {
    if (!user) return false;
    // Delete votes for this option first
    await supabase.from('poll_votes').delete().eq('option_id', optionId);
    const { error } = await supabase.from('poll_options').delete().eq('id', optionId);
    if (!error) {
      await logHistory(pollId, 'option_removed', 'option', optionLabel, undefined);
      await fetchPolls();
      return true;
    }
    return false;
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
    deleteOption,
    deletePoll,
    removeVote,
    fetchPollHistory,
    refreshPolls: fetchPolls,
  };
}
