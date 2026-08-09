// Returns a public share origin that does not require Lovable preview login.
// When running on the Lovable preview host (id-preview--*.lovable.app), the
// share URL should point to the production domain instead.
export function getPublicShareOrigin(): string {
  if (typeof window === 'undefined') return 'https://taskmates.app';
  const { origin, hostname } = window.location;
  const isPreview =
    hostname.includes('id-preview--') ||
    hostname.endsWith('.lovableproject.com') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';
  if (isPreview) return 'https://taskmates.app';
  return origin;
}

// Shareable link that renders a rich social preview (title, description and
// image) for crawlers, then instantly redirects real visitors to the app.
// Private/hidden items and communities fall back to the generic TaskMates card.
export function getSharePreviewUrl(type: 'task' | 'poll' | 'product' | 'tag', id: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) {
    return type === 'tag'
      ? `${getPublicShareOrigin()}/tags/${id}`
      : `${getPublicShareOrigin()}/share/${type}/${id}`;
  }
  return `${base}/functions/v1/share-preview/${type}/${id}`;
}
