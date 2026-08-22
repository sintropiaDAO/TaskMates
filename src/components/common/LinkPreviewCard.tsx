import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useLinkPreview } from '@/hooks/useLinkPreview';
import { extractUrls, prettyHost } from '@/lib/linkUtils';
import { cn } from '@/lib/utils';

interface LinkPreviewCardProps {
  url: string;
  className?: string;
}

/** Rich embed card for an external link shared in an item description. */
export function LinkPreviewCard({ url, className }: LinkPreviewCardProps) {
  const { preview, loading } = useLinkPreview(url);

  if (loading) {
    return <div className={cn('rounded-xl border bg-muted/30 h-20 animate-pulse', className)} />;
  }
  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex gap-3 rounded-xl border bg-card overflow-hidden hover:bg-muted/40 transition-colors',
        className,
      )}
    >
      {preview.image_url ? (
        <img
          src={preview.image_url}
          alt=""
          loading="lazy"
          className="w-24 h-24 shrink-0 object-cover bg-muted/30"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-24 h-24 shrink-0 flex items-center justify-center bg-muted/30">
          <LinkIcon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 py-2 pr-3 space-y-1">
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{preview.site_name || prettyHost(url)}</span>
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:underline">
          {preview.title || prettyHost(url)}
        </p>
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{preview.description}</p>
        )}
      </div>
    </a>
  );
}

interface DescriptionLinkPreviewsProps {
  description?: string | null;
  limit?: number;
  className?: string;
}

/** Renders embeds for the external links found inside an item description. */
export function DescriptionLinkPreviews({ description, limit = 5, className }: DescriptionLinkPreviewsProps) {
  const urls = extractUrls(description, limit);
  if (urls.length === 0) return null;
  return (
    <div className={cn('space-y-2', className)}>
      {urls.map(u => <LinkPreviewCard key={u} url={u} />)}
    </div>
  );
}

interface DescriptionHeroImageProps {
  description?: string | null;
  alt?: string;
  className?: string;
}

/**
 * Hero image fallback for items without their own image:
 * uses the preview image of the first external link in the description.
 */
export function DescriptionHeroImage({ description, alt, className }: DescriptionHeroImageProps) {
  const url = extractUrls(description, 1)[0];
  const { preview } = useLinkPreview(url);
  if (!url || !preview?.image_url) return null;
  return (
    <div className={cn('mb-3 rounded-lg overflow-hidden', className)}>
      <img
        src={preview.image_url}
        alt={alt || preview.title || ''}
        loading="lazy"
        className="w-full h-40 object-contain bg-muted/30"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
}
