import { useEffect, useRef, useState } from 'react';
import { Radio, ExternalLink, Users, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { detectLiveProvider, getLiveEmbedUrl, getLiveStatus, isRoomOpen, providerLabel, type LiveStatus } from '@/lib/liveEmbed';

export function LiveBadge({ status, pt, className }: { status: LiveStatus; pt: boolean; className?: string }) {
  if (status === 'unscheduled') return null;
  const map = {
    scheduled: { t: pt ? 'Agendada' : 'Scheduled', c: 'bg-secondary text-secondary-foreground' },
    live: { t: pt ? 'Ao vivo agora' : 'Live now', c: 'bg-destructive text-destructive-foreground' },
    ended: { t: pt ? 'Gravação' : 'Replay', c: 'bg-muted text-muted-foreground' },
  } as const;
  const m = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', m.c, className)}>
      <Radio className={cn('w-3 h-3', status === 'live' && 'animate-pulse')} />{m.t}
    </span>
  );
}

function useNow(ms = 30000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const i = setInterval(() => setNow(new Date()), ms); return () => clearInterval(i); }, [ms]);
  return now;
}

export function LivePlayer({ task, pt }: { task: any; pt: boolean }) {
  const now = useNow();
  const [host, setHost] = useState('taskmates.app');
  useEffect(() => { setHost(window.location.hostname); }, []);
  if (!task?.live_url) return null;
  const provider = detectLiveProvider(task.live_url) ?? 'other';
  const embed = getLiveEmbedUrl(task.live_url, host);
  const status = now ? getLiveStatus(task.deadline, now) : 'unscheduled';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <LiveBadge status={status} pt={pt} />
        <span className="text-muted-foreground">{providerLabel(provider)}</span>
      </div>
      {embed && now ? (
        <div className="relative w-full overflow-hidden rounded-xl bg-muted aspect-video">
          <iframe src={embed} title={task.title} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      ) : null}
      <Button asChild size="sm" variant="outline" className="rounded-xl">
        <a href={task.live_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-1" />{pt ? `Abrir no ${providerLabel(provider)}` : `Open on ${providerLabel(provider)}`}</a>
      </Button>
    </div>
  );
}

declare global { interface Window { JitsiMeetExternalAPI?: any } }

function loadJitsi(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://meet.jit.si/external_api.js';
    s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('jitsi'));
    document.head.appendChild(s);
  });
}

export function RoundtableRoom({ task, pt, isOwner }: { task: any; pt: boolean; isOwner: boolean }) {
  const { user } = useAuth();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!open || !ref.current) return;
    let disposed = false;
    setLoading(true);
    (async () => {
      try {
        await loadJitsi();
        if (disposed || !ref.current) return;
        let displayName = user?.email?.split('@')[0] || 'Aventureiro';
        let avatarURL: string | undefined;
        if (user) {
          const { data } = await supabase.from('profiles').select('full_name, username, avatar_url').eq('id', user.id).maybeSingle();
          if (data) { displayName = data.full_name || `@${data.username}`; avatarURL = data.avatar_url || undefined; }
        }
        apiRef.current = new window.JitsiMeetExternalAPI!('meet.jit.si', {
          roomName: task.room_name, parentNode: ref.current, width: '100%', height: '100%',
          userInfo: { displayName }, configOverwrite: { prejoinPageEnabled: true, subject: task.title },
        });
        if (avatarURL) apiRef.current.executeCommand('avatarUrl', avatarURL);
        apiRef.current.addListener('readyToClose', () => setOpen(false));
        // Joining counts as participation (reuses event attendance, which feeds EXP/Journeys).
        if (user && !isOwner && task.task_subtype === 'event') {
          await supabase.from('task_attendees').upsert({ task_id: task.id, user_id: user.id }, { onConflict: 'task_id,user_id', ignoreDuplicates: true });
        }
      } finally { if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; apiRef.current?.dispose?.(); apiRef.current = null; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task?.room_name) return null;
  const canJoin = now ? isRoomOpen(task.deadline, now) || isOwner : false;
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(task.room_name)}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-xl" disabled={!canJoin || !user} onClick={() => setOpen(true)}>
          <Users className="w-4 h-4 mr-1" />{pt ? 'Entrar na roda' : 'Join the circle'}
        </Button>
        {canJoin && (
          <Button asChild size="sm" variant="ghost" className="rounded-xl">
            <a href={jitsiUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-1" />{pt ? 'Abrir no app Jitsi' : 'Open in Jitsi'}</a>
          </Button>
        )}
        {!canJoin && now && <span className="text-xs text-muted-foreground">{pt ? 'A roda abre 15 min antes do horário.' : 'Opens 15 min before start.'}</span>}
      </div>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="truncate text-sm font-semibold">🌿 {pt ? 'Roda de conversa' : 'Conversation circle'} · {task.title}</span>
            <Button size="icon" variant="ghost" aria-label={pt ? 'Sair da roda' : 'Leave'} onClick={() => setOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
          <div className="relative flex-1">
            {loading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}
            <div ref={ref} className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  );
}

/** Compact card badge; only shown when the item has a live or circle and is scheduled/live. */
export function CardLiveBadge({ task, pt }: { task: any; pt: boolean }) {
  const now = useNow(60000);
  if (!now || !(task?.live_url || task?.room_name) || task?.status === 'completed') return null;
  const status = getLiveStatus(task.deadline, now);
  if (status !== 'live' && status !== 'scheduled') return null;
  return <div className="mb-2"><LiveBadge status={status} pt={pt} /></div>;
}
