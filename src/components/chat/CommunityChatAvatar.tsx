import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CommunityChatAvatarProps {
  tagId: string;
  imageUrl?: string | null;
  emoji?: string | null;
  className?: string;
  iconClassName?: string;
}

export function CommunityChatAvatar({
  tagId,
  imageUrl,
  emoji,
  className,
  iconClassName,
}: CommunityChatAvatarProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(imageUrl ?? null);
  const [logoEmoji, setLogoEmoji] = useState<string | null>(emoji ?? null);

  useEffect(() => {
    setLogoUrl(imageUrl ?? null);
    setLogoEmoji(emoji ?? null);
    if (imageUrl || emoji || !tagId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('community_settings')
        .select('logo_url, logo_emoji')
        .eq('tag_id', tagId)
        .maybeSingle();
      if (cancelled || !data) return;
      setLogoUrl((data as any).logo_url ?? null);
      setLogoEmoji((data as any).logo_emoji ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [tagId, imageUrl, emoji]);

  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden',
        className
      )}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" className="w-full h-full object-cover" />
      ) : logoEmoji ? (
        <span className="text-xl leading-none">{logoEmoji}</span>
      ) : (
        <Users className={cn('text-primary', iconClassName)} />
      )}
    </div>
  );
}
