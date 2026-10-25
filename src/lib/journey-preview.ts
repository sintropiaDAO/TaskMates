export interface PublicJourneyPreview {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  author_name: string | null;
  author_username: string | null;
}

export function publicJourneyImage(image: string | null | undefined): string | null {
  if (!image) return null;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}