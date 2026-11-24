import { describe, expect, it } from 'vitest';
import { DEFAULT_SECRET_VOTE, getPollOptionCount, isVoteModeLocked } from './pollVoting';

describe('poll voting rules', () => {
  it('defaults new and legacy opinions to secret voting', () => {
    expect(DEFAULT_SECRET_VOTE).toBe(true);
    expect(isVoteModeLocked()).toBe(false);
  });
  it('never allows editing an open voting mode, even before votes', () => {
    expect(isVoteModeLocked(false, 0)).toBe(true);
  });
  it('does not allow making existing secret ballots public', () => {
    expect(isVoteModeLocked(true, 1)).toBe(true);
    expect(isVoteModeLocked(true, 0)).toBe(false);
  });
  it('counts aggregate secret results without requiring individual choices', () => {
    expect(getPollOptionCount([{ option_id: null, vote_counts: { apple: 3, pear: 2 } }], 'apple')).toBe(3);
    expect(getPollOptionCount([{ option_id: null, vote_counts: { apple: 3, pear: 2 } }], 'pear')).toBe(2);
    expect(getPollOptionCount([], 'apple')).toBe(0);
  });
});