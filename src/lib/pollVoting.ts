import type { Json } from '@/integrations/supabase/types';

export const DEFAULT_SECRET_VOTE = true;

export function isVoteModeLocked(secretVote: boolean = DEFAULT_SECRET_VOTE, voteCount = 0) {
  return !secretVote || voteCount > 0;
}

export function getPollOptionCount(votes: { option_id: string | null; vote_counts?: Json | null }[] = [], optionId: string) {
  const counts = votes[0]?.vote_counts;
  if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
    const count = counts[optionId];
    if (typeof count === 'number') return count;
  }
  return votes.filter(v => v.option_id === optionId).length;
}

export function voteModeNotice(secretVote: boolean = DEFAULT_SECRET_VOTE, language: string = 'pt') {
  return secretVote
    ? (language === 'pt' ? 'Voto Secreto: as pessoas podem ver que você votou, mas não a sua escolha.' : 'Secret vote: people can see that you voted, but not your choice.')
    : (language === 'pt' ? 'Voto Aberto: sua escolha ficará visível junto ao seu nome. Esta configuração não pode ser alterada.' : 'Open vote: your choice will be visible beside your name. This setting cannot be changed.');
}