// Journey (Jornada) configuration: step actions, items, indicators and EXP multiplier.
import { TASK_SUBTYPES, SUBTYPE_META } from '@/lib/taskSubtypes';

type L = { pt: string; en: string };

export type JourneyAction = 'create' | 'complete' | 'participate' | 'comment' | 'rate' | 'vote' | 'like' | 'checkin' | 'follow_tag' | 'follow_person';
export type JourneyItemKind = 'task' | 'product' | 'poll' | 'tag' | 'person';
export type IndicatorOp = 'gt' | 'gte' | 'eq' | 'lte' | 'lt';
export type IndicatorMetric = 'comments' | 'participants' | 'likes' | 'downvotes' | 'reports' | 'ratings' | 'avg_rating' | 'proofs';

export interface JourneyIndicator { metric: IndicatorMetric; op: IndicatorOp; value: number }

export interface JourneyStepInput {
  title?: string | null;
  action: JourneyAction;
  item_kind?: JourneyItemKind | null;
  item_type?: string | null;
  item_subtype?: string | null;
  tag_category?: string | null;
  tag_ids?: string[];
  tag_match?: 'any' | 'all';
  entity_id?: string | null;
  indicators?: JourneyIndicator[];
}

export const ACTIONS: { key: JourneyAction; label: L; kinds: JourneyItemKind[] }[] = [
  { key: 'create', label: { pt: 'Criar', en: 'Create' }, kinds: ['task', 'product', 'poll'] },
  { key: 'complete', label: { pt: 'Concluir', en: 'Complete' }, kinds: ['task', 'poll'] },
  { key: 'participate', label: { pt: 'Participar', en: 'Participate' }, kinds: ['task', 'product', 'poll'] },
  { key: 'comment', label: { pt: 'Comentar', en: 'Comment' }, kinds: ['task', 'product', 'poll'] },
  { key: 'rate', label: { pt: 'Avaliar', en: 'Rate' }, kinds: ['task', 'product'] },
  { key: 'vote', label: { pt: 'Votar', en: 'Vote' }, kinds: ['poll', 'task'] },
  { key: 'like', label: { pt: 'Curtir', en: 'Like' }, kinds: ['task', 'product', 'poll'] },
  { key: 'checkin', label: { pt: 'Fazer check-in em evento', en: 'Check in at event' }, kinds: [] },
  { key: 'follow_tag', label: { pt: 'Seguir uma tag', en: 'Follow a tag' }, kinds: ['tag'] },
  { key: 'follow_person', label: { pt: 'Seguir uma pessoa', en: 'Follow a person' }, kinds: ['person'] },
];

export const ITEM_KINDS: Record<JourneyItemKind, L> = {
  task: { pt: 'Tarefa', en: 'Task' },
  product: { pt: 'Produto', en: 'Product' },
  poll: { pt: 'Opinião', en: 'Opinion' },
  tag: { pt: 'Tag', en: 'Tag' },
  person: { pt: 'Pessoa', en: 'Person' },
};

export const ITEM_TYPES: Partial<Record<JourneyItemKind, { key: string; label: L }[]>> = {
  task: [
    { key: 'offer', label: { pt: 'Oferta', en: 'Offer' } },
    { key: 'request', label: { pt: 'Pedido', en: 'Request' } },
    { key: 'personal', label: { pt: 'Pessoal', en: 'Personal' } },
  ],
  product: [
    { key: 'offer', label: { pt: 'Oferta', en: 'Offer' } },
    { key: 'request', label: { pt: 'Pedido', en: 'Request' } },
  ],
  poll: [
    { key: 'poll', label: { pt: 'Enquete com votos', en: 'Poll' } },
    { key: 'opinion', label: { pt: 'Somente opiniões', en: 'Opinions only' } },
  ],
  tag: [
    { key: 'communities', label: { pt: 'Comunidade', en: 'Community' } },
    { key: 'skills', label: { pt: 'Habilidade', en: 'Skill' } },
    { key: 'physical_resources', label: { pt: 'Recurso', en: 'Resource' } },
  ],
};

export function taskSubtypeOptions(lang: 'pt' | 'en') {
  return TASK_SUBTYPES.map(k => ({ key: k, label: `${SUBTYPE_META[k].emoji} ${SUBTYPE_META[k][lang]}` }));
}

export const METRICS: { key: IndicatorMetric; label: L }[] = [
  { key: 'comments', label: { pt: 'Comentários', en: 'Comments' } },
  { key: 'participants', label: { pt: 'Participantes', en: 'Participants' } },
  { key: 'likes', label: { pt: 'Curtidas', en: 'Likes' } },
  { key: 'downvotes', label: { pt: 'Downvotes', en: 'Downvotes' } },
  { key: 'reports', label: { pt: 'Denúncias', en: 'Reports' } },
  { key: 'ratings', label: { pt: 'Avaliações', en: 'Ratings' } },
  { key: 'avg_rating', label: { pt: 'Nota média', en: 'Average rating' } },
  { key: 'proofs', label: { pt: 'Provas', en: 'Proofs' } },
];

export const OPS: { key: IndicatorOp; label: string }[] = [
  { key: 'gt', label: '>' }, { key: 'gte', label: '≥' }, { key: 'eq', label: '=' }, { key: 'lte', label: '≤' }, { key: 'lt', label: '<' },
];

export function compareIndicator(value: number, op: IndicatorOp, target: number): boolean {
  switch (op) {
    case 'gt': return value > target;
    case 'gte': return value >= target;
    case 'eq': return value === target;
    case 'lte': return value <= target;
    case 'lt': return value < target;
  }
}

/** +10% EXP per completed journey, capped at x2.0. */
export const JOURNEY_MULTIPLIER_STEP = 0.1;
export const JOURNEY_MULTIPLIER_CAP = 2;
export function journeyMultiplier(completed: number): number {
  const m = 1 + Math.max(0, completed) * JOURNEY_MULTIPLIER_STEP;
  return Math.round(Math.min(JOURNEY_MULTIPLIER_CAP, m) * 100) / 100;
}

export function describeStep(s: JourneyStepInput, lang: 'pt' | 'en', tagName?: (id: string) => string): string {
  const action = ACTIONS.find(a => a.key === s.action)?.label[lang] ?? s.action;
  const parts: string[] = [action];
  if (s.item_kind && s.item_kind !== 'tag' && s.item_kind !== 'person') {
    parts.push('1 ' + ITEM_KINDS[s.item_kind][lang].toLowerCase());
    const type = ITEM_TYPES[s.item_kind]?.find(t => t.key === s.item_type);
    if (type) parts.push(type.label[lang].toLowerCase());
    if (s.item_subtype && s.item_subtype in SUBTYPE_META) parts.push(`(${SUBTYPE_META[s.item_subtype as keyof typeof SUBTYPE_META][lang].toLowerCase()})`);
  }
  if (s.item_kind === 'tag' && s.tag_category) {
    const c = ITEM_TYPES.tag?.find(t => t.key === s.tag_category);
    if (c) parts.push(`(${c.label[lang].toLowerCase()})`);
  }
  if (s.entity_id) parts.push(lang === 'pt' ? 'específico' : 'specific');
  if (s.tag_ids?.length && tagName) {
    const joiner = s.tag_match === 'all' ? (lang === 'pt' ? ' e ' : ' and ') : (lang === 'pt' ? ' ou ' : ' or ');
    parts.push((lang === 'pt' ? 'com ' : 'with ') + s.tag_ids.map(id => '#' + tagName(id)).join(joiner));
  }
  for (const ind of s.indicators ?? []) {
    const m = METRICS.find(x => x.key === ind.metric)?.label[lang] ?? ind.metric;
    const o = OPS.find(x => x.key === ind.op)?.label ?? ind.op;
    parts.push(`· ${m} ${o} ${ind.value}`);
  }
  return parts.join(' ');
}

export const STARTER_JOURNEY_ID = '00000000-0000-4000-a000-000000000001';
