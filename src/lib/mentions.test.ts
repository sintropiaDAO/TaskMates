import { describe, it, expect } from 'vitest';
import { extractMentionUsernames, mentionAtCursor, insertMention, chatShareMessage } from './mentions';

describe('comment mentions', () => {
  it('identifies @usernames without treating email addresses as mentions', () => {
    expect(extractMentionUsernames('Oi @ana_123 e (@bruno)! email@ana_123.com')).toEqual(['ana_123', 'bruno']);
  });
  it('notifies a repeated case-insensitive username once per comment', () => {
    expect(extractMentionUsernames('@Ana @ana @ANA')).toEqual(['ana']);
  });
  it('respects the existing 3 to 30 character handle rule', () => {
    expect(extractMentionUsernames('@ab @' + 'a'.repeat(31))).toEqual([]);
    expect(extractMentionUsernames('@' + 'a'.repeat(30))).toEqual(['a'.repeat(30)]);
  });
  it('replaces only the mention at the cursor and preserves the rest of a comment', () => {
    const text = 'Oi @an, vamos plantar?';
    const token = mentionAtCursor(text, 6);
    expect(token).toEqual({ start: 3, end: 6, query: 'an' });
    if (!token) throw new Error('Missing token');
    expect(insertMention(text, token, 'ana')).toBe('Oi @ana , vamos plantar?');
    expect(mentionAtCursor('email@ana', 9)).toBeNull();
  });
});

it('shares the title and full item link without replacing the destination', () => {
  expect(chatShareMessage(' Horta ', 'https://taskmates.app/share/task/123')).toBe('Horta\nhttps://taskmates.app/share/task/123');
});