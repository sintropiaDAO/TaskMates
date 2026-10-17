import { Users, Tent, Rocket, Wrench, type LucideIcon } from 'lucide-react';

export type TaskSubtype = 'meeting' | 'event' | 'project' | 'service';
export type ServiceDeliveryFormat = 'remote' | 'in_person' | 'both';

/** Persisted together with the base task, before notifying list/detail consumers. */
export interface TaskSubtypeFields {
  task_subtype: TaskSubtype;
  meeting_url: string | null;
  meeting_notes: string | null;
  event_is_hybrid: boolean;
  event_max_attendees: number | null;
  service_delivery_format: ServiceDeliveryFormat | null;
  project_deliverables: string | null;
}

export const TASK_SUBTYPES: TaskSubtype[] = ['meeting', 'event', 'project', 'service'];

export const SUBTYPE_META: Record<TaskSubtype, { pt: string; en: string; emoji: string; icon: LucideIcon; portfolioPt: string; portfolioEn: string }> = {
  meeting: { pt: 'Reunião', en: 'Meeting', emoji: '🤝', icon: Users, portfolioPt: 'Reuniões', portfolioEn: 'Meetings' },
  event: { pt: 'Evento', en: 'Event', emoji: '🎪', icon: Tent, portfolioPt: 'Eventos', portfolioEn: 'Events' },
  project: { pt: 'Projeto', en: 'Project', emoji: '🚀', icon: Rocket, portfolioPt: 'Projetos', portfolioEn: 'Projects' },
  service: { pt: 'Serviço', en: 'Service', emoji: '🛠️', icon: Wrench, portfolioPt: 'Serviços', portfolioEn: 'Services' },
};

export function subtypeLabel(s: TaskSubtype | null | undefined, lang: string) {
  const m = SUBTYPE_META[(s || 'service') as TaskSubtype] ?? SUBTYPE_META.service;
  return lang === 'pt' ? m.pt : m.en;
}

/** Open meeting-notes template (agenda / decisions / action items), inspired by open governance templates. */
export function meetingNotesTemplate(lang: string) {
  if (lang === 'pt') {
    return `<h2>🎯 Objetivo e Pauta</h2><ul><li>Propósito da reunião:</li><li>Tópico 1</li><li>Tópico 2</li></ul><h2>👥 Participantes e Papéis</h2><ul><li>Facilitação:</li><li>Relatoria:</li><li>Presentes:</li></ul><h2>💬 Discussão</h2><p></p><h2>💡 Decisões</h2><ul><li></li></ul><h2>✅ Próximos Passos</h2><ul><li>[Ação] — Responsável — Prazo</li></ul>`;
  }
  return `<h2>🎯 Goal & Agenda</h2><ul><li>Meeting purpose:</li><li>Topic 1</li><li>Topic 2</li></ul><h2>👥 Attendees & Roles</h2><ul><li>Facilitator:</li><li>Note taker:</li><li>Present:</li></ul><h2>💬 Discussion</h2><p></p><h2>💡 Decisions</h2><ul><li></li></ul><h2>✅ Action Items</h2><ul><li>[Action] — Owner — Due date</li></ul>`;
}

function toIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildCalendarLinks(opts: { title: string; description?: string | null; start: Date; end?: Date; location?: string | null }) {
  const end = opts.end ?? new Date(opts.start.getTime() + 60 * 60 * 1000);
  const details = stripHtml(opts.description || '').slice(0, 800);
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(opts.title)}&dates=${toIcsDate(opts.start)}/${toIcsDate(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(opts.location || '')}`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TaskMates//PT', 'BEGIN:VEVENT',
    `UID:${Date.now()}@taskmates.app`, `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(opts.start)}`, `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${opts.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${details.replace(/\n/g, ' ')}`,
    `LOCATION:${(opts.location || '').replace(/\n/g, ' ')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return { google, icsDataUrl: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

export function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
