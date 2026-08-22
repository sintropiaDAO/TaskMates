import { useQuery } from '@tanstack/react-query';
import { getLinkPreview } from '@/lib/link-preview.functions';
import { extractFirstUrl } from '@/lib/linkUtils';

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  status: string;
}

/** Fetches (and caches) the embed metadata of an external link. */
export function useLinkPreview(url?: string | null) {
  const query = useQuery({
    queryKey: ['link-preview', url],
    enabled: !!url,
    staleTime: 1000 * 60 * 60,
    queryFn: async () =>
      (await getLinkPreview({ data: { url: url as string } })) as LinkPreviewData | null,
  });
  return { preview: query.data ?? null, loading: query.isLoading };
}

/** Preview of the first external link found in an item description. */
export function useFirstLinkPreview(description?: string | null) {
  const url = extractFirstUrl(description);
  const { preview, loading } = useLinkPreview(url);
  return { url, preview, loading };
}
