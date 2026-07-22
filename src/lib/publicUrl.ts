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
