import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Poll, PollOption, PollVote, PollQuestion, Tag, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PollQuestionInput {
  label: string;
  options: string[];
}


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

const isPt = () =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt');

const errMsg = (e: unknown, fallbackPt: string, fallbackEn: string) => {
  const base = isPt() ? fallbackPt : fallbackEn;
  const detail = (e as any)?.message;
  return detail ? `${base}: ${detail}` : base;
};

export function usePolls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    const { data: pollsData, error } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !pollsData) {
      console.error('Error fetching polls:', error);
      toast.error(isPt() ? 'Falha ao carregar opiniões' : 'Failed to load polls');
      if (!silent) setLoading(false);
      return;
    }

    const pollIds = pollsData.map(p => p.id);
    const creatorIds = [...new Set(pollsData.map(p => p.created_by))];

    const [tagsResult, profilesResult, optionsResult, votesResult, questionsResult] = await Promise.all([
      supabase.from('poll_tags').select('poll_id, tag:tags(*)').in('poll_id', pollIds),
      supabase.from('public_profiles').select('*').in('id', creatorIds),
      supabase.from('poll_options').select('*').in('poll_id', pollIds),
      supabase.from('poll_votes').select('*').in('poll_id', pollIds),
      supabase.from('poll_questions' as any).select('*').in('poll_id', pollIds),
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

    const questionsByPoll: Record<string, PollQuestion[]> = {};
    (questionsResult.data as any[] | null)?.forEach((q: any) => {
      if (!questionsByPoll[q.poll_id]) questionsByPoll[q.poll_id] = [];
      questionsByPoll[q.poll_id].push(q as PollQuestion);
    });
    Object.values(questionsByPoll).forEach(list => list.sort((a, b) => a.position - b.position));

    const enriched = pollsData.map(p => ({
      ...p,
      tags: tagsByPoll[p.id] || [],
      creator: profilesMap[p.created_by],
      options: optionsByPoll[p.id] || [],
      votes: votesByPoll[p.id] || [],
      questions: questionsByPoll[p.id] || [],
    })) as Poll[];

    setPolls(enriched);
    if (!silent) setLoading(false);
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
    minQuorum?: number | null,
    imageUrl?: string,
    questionGroups?: PollQuestionInput[],
    opinionsOnly: boolean = false
  ) => {
    if (!user) return null;

    const loadingId = toast.loading(isPt() ? 'Criando opinião...' : 'Creating poll...');
    try {
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
          image_url: imageUrl || null,
          opinions_only: opinionsOnly,
        } as any)
        .select()
        .single();

      if (error || !poll) throw error || new Error('No poll returned');

      const groups: PollQuestionInput[] =
        questionGroups && questionGroups.length > 0
          ? questionGroups
          : options.length > 0
            ? [{ label: '', options }]
            : [];

      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const { data: q, error: qErr } = await supabase
          .from('poll_questions' as any)
          .insert({ poll_id: poll.id, label: g.label || '', position: i })
          .select()
          .single();
        if (qErr) throw qErr;
        const questionId = (q as any)?.id || null;
        const validOpts = g.options.filter(o => o.trim());
        if (validOpts.length > 0) {
          const { error: oErr } = await supabase.from('poll_options').insert(
            validOpts.map(label => ({
              poll_id: poll.id,
              label,
              created_by: user.id,
              question_id: questionId,
            } as any))
          );
          if (oErr) throw oErr;
        }
      }

      if (tagIds.length > 0) {
        const { error: tErr } = await supabase.from('poll_tags').insert(
          tagIds.map(tagId => ({ poll_id: poll.id, tag_id: tagId }))
        );
        if (tErr) throw tErr;
      }

      await logHistory(poll.id, 'created', undefined, undefined, title);
      await fetchPolls();
      toast.success(isPt() ? 'Opinião criada!' : 'Poll created!', { id: loadingId });
      return poll as Poll;
    } catch (e) {
      console.error('createPoll error:', e);
      toast.error(errMsg(e, 'Falha ao criar opinião', 'Failed to create poll'), { id: loadingId });
      return null;
    }
  };

  const updatePoll = async (
    pollId: string,
    title: string,
    description: string,
    tagIds: string[],
    deadline?: string,
    allowNewOptions?: boolean,
    minQuorum?: number | null,
    imageUrl?: string,
    opinionsOnly?: boolean
  ) => {
    if (!user) return false;

    const loadingId = toast.loading(isPt() ? 'Salvando alterações...' : 'Saving changes...');
    try {
      const currentPoll = polls.find(p => p.id === pollId);

      const { error } = await supabase
        .from('polls')
        .update({
          title,
          description,
          deadline: deadline || null,
          allow_new_options: allowNewOptions,
          min_quorum: minQuorum || null,
          image_url: imageUrl !== undefined ? (imageUrl || null) : undefined,
          ...(opinionsOnly !== undefined ? { opinions_only: opinionsOnly } : {}),
        } as any)
        .eq('id', pollId);

      if (error) throw error;

      await supabase.from('poll_tags').delete().eq('poll_id', pollId);
      if (tagIds.length > 0) {
        const { error: tErr } = await supabase.from('poll_tags').insert(
          tagIds.map(tagId => ({ poll_id: pollId, tag_id: tagId }))
        );
        if (tErr) throw tErr;
      }

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
      toast.success(isPt() ? 'Opinião atualizada!' : 'Poll updated!', { id: loadingId });
      return true;
    } catch (e) {
      console.error('updatePoll error:', e);
      toast.error(errMsg(e, 'Falha ao atualizar opinião', 'Failed to update poll'), { id: loadingId });
      return false;
    }
  };

  const vote = async (pollId: string, optionId: string, questionId?: string | null) => {
    if (!user) return false;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (!(profileData as any)?.is_verified) {
        toast.error(isPt() ? 'Apenas usuários verificados podem votar' : 'Only verified users can vote');
        return false;
      }

      let query = supabase
        .from('poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id);
      query = questionId
        ? query.eq('question_id', questionId)
        : query.is('question_id', null);
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase.from('poll_votes').update({ option_id: optionId } as any).eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('poll_votes').insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
          question_id: questionId ?? null,
        } as any);
        if (error) throw error;
      }

      await fetchPolls();
      toast.success(isPt() ? 'Voto registrado' : 'Vote recorded');
      return true;
    } catch (e) {
      console.error('vote error:', e);
      toast.error(errMsg(e, 'Falha ao registrar voto', 'Failed to record vote'));
      return false;
    }
  };

  const addOption = async (pollId: string, label: string, questionId?: string | null) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('poll_options')
        .insert({ poll_id: pollId, label, created_by: user.id, question_id: questionId ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      await logHistory(pollId, 'option_added', 'option', undefined, label);
      await fetchPolls();
      toast.success(isPt() ? 'Opção adicionada' : 'Option added');
      return data as PollOption;
    } catch (e) {
      console.error('addOption error:', e);
      toast.error(errMsg(e, 'Falha ao adicionar opção', 'Failed to add option'));
      return null;
    }
  };


  const deleteOption = async (pollId: string, optionId: string, optionLabel: string) => {
    if (!user) return false;
    try {
      await supabase.from('poll_votes').delete().eq('option_id', optionId);
      const { error } = await supabase.from('poll_options').delete().eq('id', optionId);
      if (error) throw error;
      await logHistory(pollId, 'option_removed', 'option', optionLabel, undefined);
      await fetchPolls();
      toast.success(isPt() ? 'Opção removida' : 'Option removed');
      return true;
    } catch (e) {
      console.error('deleteOption error:', e);
      toast.error(errMsg(e, 'Falha ao remover opção', 'Failed to remove option'));
      return false;
    }
  };

  const deletePoll = async (pollId: string) => {
    if (!user) return false;
    const loadingId = toast.loading(isPt() ? 'Excluindo opinião...' : 'Deleting poll...');
    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
      await fetchPolls();
      toast.success(isPt() ? 'Opinião excluída' : 'Poll deleted', { id: loadingId });
      return true;
    } catch (e) {
      console.error('deletePoll error:', e);
      toast.error(errMsg(e, 'Falha ao excluir opinião', 'Failed to delete poll'), { id: loadingId });
      return false;
    }
  };

  const removeVote = async (pollId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);
      if (error) throw error;
      await fetchPolls();
      toast.success(isPt() ? 'Voto removido' : 'Vote removed');
      return true;
    } catch (e) {
      console.error('removeVote error:', e);
      toast.error(errMsg(e, 'Falha ao remover voto', 'Failed to remove vote'));
      return false;
    }
  };

  const votePoll = async (pollId: string, voteType: 'up' | 'down') => {
    if (!user) return false;
    try {
      const { data: existing } = await supabase
        .from('poll_likes' as any)
        .select('*')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        if ((existing as any).like_type === voteType) {
          const { error } = await supabase.from('poll_likes' as any).delete().eq('id', (existing as any).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('poll_likes' as any).update({ like_type: voteType }).eq('id', (existing as any).id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('poll_likes' as any).insert({
          poll_id: pollId,
          user_id: user.id,
          like_type: voteType,
        });
        if (error) throw error;
      }

      await fetchPolls(true);
      return true;
    } catch (e) {
      console.error('votePoll error:', e);
      toast.error(errMsg(e, 'Falha ao registrar reação', 'Failed to record reaction'));
      return false;
    }
  };

  const getUserPollVote = async (pollId: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('poll_likes' as any)
      .select('like_type')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle();
    return data ? (data as any).like_type : null;
  };

  const reopenPoll = async (pollId: string, newDeadline: string) => {
    if (!user) return false;
    const loadingId = toast.loading(isPt() ? 'Reabrindo opinião...' : 'Reopening poll...');
    try {
      const { error } = await supabase
        .from('polls')
        .update({
          status: 'active',
          deadline: newDeadline,
          updated_at: new Date().toISOString()
        })
        .eq('id', pollId)
        .eq('created_by', user.id);

      if (error) throw error;

      await logHistory(pollId, 'reopened', 'status', 'closed', 'active');
      await logHistory(pollId, 'updated', 'deadline', '', newDeadline);
      await fetchPolls();
      toast.success(isPt() ? 'Opinião reaberta' : 'Poll reopened', { id: loadingId });
      return true;
    } catch (e) {
      console.error('reopenPoll error:', e);
      toast.error(errMsg(e, 'Falha ao reabrir opinião', 'Failed to reopen poll'), { id: loadingId });
      return false;
    }
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
    votePoll,
    getUserPollVote,
    reopenPoll,
    refreshPolls: fetchPolls,
  };
}
