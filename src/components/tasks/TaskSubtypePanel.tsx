import { useEffect, useState, useCallback } from 'react';
import { Video, CalendarPlus, Download, MapPin, Users, CheckCircle2, Star, Loader2, Rocket, Wrench, Globe, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SUBTYPE_META, buildCalendarLinks, isSameLocalDay, type TaskSubtype } from '@/lib/taskSubtypes';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface Props {
  task: any;
  isOwner: boolean;
  isCompleted: boolean;
}

interface Attendee { id: string; user_id: string; status: string; checked_in_at: string | null }

/** Contextual block shown in the task detail modal according to its subtype. */
export function TaskSubtypePanel({ task, isOwner, isCompleted }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const subtype = (task?.task_subtype || 'service') as TaskSubtype;
  const meta = SUBTYPE_META[subtype];

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const loadAttendees = useCallback(async () => {
    if (subtype !== 'event') return;
    const { data } = await supabase.from('task_attendees').select('id, user_id, status, checked_in_at').eq('task_id', task.id);
    setAttendees((data as Attendee[]) || []);
  }, [task?.id, subtype]);

  useEffect(() => { loadAttendees(); }, [loadAttendees]);

  useEffect(() => {
    if (subtype !== 'project') return;
    supabase.from('tasks').select('id, status').eq('parent_task_id', task.id).then(({ data }) => {
      const list = data || [];
      setProgress({ total: list.length, done: list.filter(t => t.status === 'completed').length });
    });
  }, [task?.id, subtype]);

  const start = task?.deadline ? new Date(task.deadline) : null;
  const cal = start ? buildCalendarLinks({ title: task.title, description: task.description, start, location: task.meeting_url || task.location }) : null;

  const mine = attendees.find(a => a.user_id === user?.id);
  const checkedIn = attendees.filter(a => a.status === 'checked_in').length;
  const isEventDay = start ? isSameLocalDay(start, new Date()) || start < new Date() : true;
  const full = task.event_max_attendees ? attendees.length >= task.event_max_attendees : false;

  const toggleInterest = async () => {
    if (!user) return;
    setBusy(true);
    if (mine) {
      await supabase.from('task_attendees').delete().eq('id', mine.id);
    } else {
      if (full) { toast.error(pt ? 'Vagas esgotadas' : 'No spots left'); setBusy(false); return; }
      const { error } = await supabase.from('task_attendees').insert({ task_id: task.id, user_id: user.id });
      if (error) toast.error(pt ? 'Não foi possível registrar' : 'Could not register');
      else toast.success(pt ? 'Interesse registrado!' : 'Interest registered!');
    }
    await loadAttendees();
    setBusy(false);
  };

  const checkIn = async (attendeeId: string) => {
    setBusy(true);
    const { error } = await supabase.from('task_attendees').update({ status: 'checked_in', checked_in_at: new Date().toISOString() }).eq('id', attendeeId);
    if (error) toast.error(pt ? 'Erro no check-in' : 'Check-in failed');
    else toast.success(pt ? 'Presença confirmada!' : 'Attendance confirmed!');
    await loadAttendees();
    setBusy(false);
  };

  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-base leading-none">{meta.emoji}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span>{pt ? meta.pt : meta.en}</span>
      </div>

      {subtype === 'meeting' && (
        <>
          <div className="flex flex-wrap gap-2">
            {task.meeting_url && (
              <Button asChild size="sm" className="rounded-xl">
                <a href={task.meeting_url} target="_blank" rel="noopener noreferrer"><Video className="w-4 h-4 mr-1" />{pt ? 'Entrar na reunião' : 'Join meeting'}</a>
              </Button>
            )}
            {cal && !isCompleted && <CalendarButtons cal={cal} pt={pt} />}
          </div>
          {task.meeting_notes ? (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{pt ? 'Notas da reunião' : 'Meeting notes'}</div>
              <div className="prose prose-sm max-w-none dark:prose-invert break-words rounded-xl bg-background p-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.meeting_notes) }} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{pt ? 'Ainda não há notas registradas. Quem organiza pode adicioná-las editando a tarefa.' : 'No notes yet. The organizer can add them by editing the task.'}</p>
          )}
        </>
      )}

      {subtype === 'event' && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location}</span>}
            {task.event_is_hybrid && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{pt ? 'Híbrido' : 'Hybrid'}</span>}
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{attendees.length}{task.event_max_attendees ? `/${task.event_max_attendees}` : ''} {pt ? 'interessados' : 'interested'}</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{checkedIn} {pt ? 'presenças' : 'check-ins'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isOwner && !isCompleted && user && (
              <Button size="sm" variant={mine ? 'secondary' : 'default'} onClick={toggleInterest} disabled={busy || mine?.status === 'checked_in'} className="rounded-xl">
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Star className={cn('w-4 h-4 mr-1', mine && 'fill-current')} />}
                {mine ? (pt ? 'Vou comparecer ✓' : 'Attending ✓') : (pt ? 'Comparecer / Tenho interesse' : 'Attend / Interested')}
              </Button>
            )}
            {mine && mine.status !== 'checked_in' && isEventDay && (
              <Button size="sm" variant="outline" onClick={() => checkIn(mine.id)} disabled={busy} className="rounded-xl">
                <CheckCircle2 className="w-4 h-4 mr-1" />{pt ? 'Confirmar presença' : 'Check in'}
              </Button>
            )}
            {mine?.status === 'checked_in' && <span className="text-xs font-semibold text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{pt ? 'Presença confirmada' : 'Checked in'}</span>}
            {task.meeting_url && (
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <a href={task.meeting_url} target="_blank" rel="noopener noreferrer"><Video className="w-4 h-4 mr-1" />{pt ? 'Transmissão' : 'Live stream'}</a>
              </Button>
            )}
            {cal && !isCompleted && <CalendarButtons cal={cal} pt={pt} />}
          </div>
          {isOwner && attendees.some(a => a.status !== 'checked_in') && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">{pt ? 'Validar presenças' : 'Validate attendance'}</div>
              <AttendeeList attendees={attendees} onCheckIn={checkIn} busy={busy} pt={pt} />
            </div>
          )}
        </>
      )}

      {subtype === 'project' && (
        <>
          {task.project_deliverables && (
            <div className="text-xs"><span className="font-semibold">{pt ? 'Entregáveis: ' : 'Deliverables: '}</span><span className="text-muted-foreground whitespace-pre-line">{task.project_deliverables}</span></div>
          )}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Rocket className="w-3.5 h-3.5" />{pt ? 'Progresso das etapas' : 'Step progress'}</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} className="h-2" />
            {progress.total === 0 && <p className="text-[11px] text-muted-foreground">{pt ? 'Adicione subtarefas em Ações Relacionadas para acompanhar o progresso.' : 'Add subtasks in Related Actions to track progress.'}</p>}
          </div>
        </>
      )}

      {subtype === 'service' && task.service_delivery_format && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Wrench className="w-3.5 h-3.5" />
          {task.service_delivery_format === 'remote' ? (pt ? 'Remoto' : 'Remote') : task.service_delivery_format === 'in_person' ? (pt ? 'Presencial' : 'In person') : (pt ? 'Remoto ou presencial' : 'Remote or in person')}
        </div>
      )}
    </div>
  );
}

function CalendarButtons({ cal, pt }: { cal: { google: string; icsDataUrl: string }; pt: boolean }) {
  return (
    <>
      <Button asChild size="sm" variant="outline" className="rounded-xl">
        <a href={cal.google} target="_blank" rel="noopener noreferrer"><CalendarPlus className="w-4 h-4 mr-1" />{pt ? 'Agenda Google' : 'Google Calendar'}</a>
      </Button>
      <Button asChild size="sm" variant="ghost" className="rounded-xl">
        <a href={cal.icsDataUrl} download="taskmates.ics"><Download className="w-4 h-4 mr-1" />.ics</a>
      </Button>
    </>
  );
}

function AttendeeList({ attendees, onCheckIn, busy, pt }: { attendees: Attendee[]; onCheckIn: (id: string) => void; busy: boolean; pt: boolean }) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = attendees.map(a => a.user_id);
    if (!ids.length) return;
    supabase.from('profiles').select('id, full_name, username').in('id', ids).then(({ data }) => {
      setNames(Object.fromEntries((data || []).map(p => [p.id, p.full_name || `@${p.username}`])));
    });
  }, [attendees]);
  return (
    <ul className="space-y-1">
      {attendees.map(a => (
        <li key={a.id} className="flex items-center justify-between gap-2 text-xs rounded-lg bg-background px-2 py-1">
          <span className="truncate">{names[a.user_id] || '…'}</span>
          {a.status === 'checked_in'
            ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            : <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={busy} onClick={() => onCheckIn(a.id)}>{pt ? 'Confirmar' : 'Confirm'}</Button>}
        </li>
      ))}
    </ul>
  );
}
