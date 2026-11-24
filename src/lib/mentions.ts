export function extractMentionUsernames(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(/(?:^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,30})(?![a-zA-Z0-9_])/g), m => (m[1] ?? '').toLowerCase()))];
}

export function mentionAtCursor(text: string, cursor: number) {
  const match = /(?:^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{0,30})$/.exec(text.slice(0, cursor));
  if (!match) return null;
  const query = match[1] ?? '';
  return { start: cursor - query.length - 1, end: cursor, query };
}

export function insertMention(text: string, token: { start: number; end: number }, username: string) {
  return text.slice(0, token.start) + '@' + username + ' ' + text.slice(token.end);
}

export function chatShareMessage(title: string, url: string) {
  return `${title.trim()}\n${url}`;
}