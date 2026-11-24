// Vocation quiz ("Qual é a sua Ocupação de Aventureiro?"): questions, weights, occupations and journey templates.
import type { JourneyStepInput } from '@/lib/journeys';

export type VocationCategory =
  | 'leadership' | 'collaboration' | 'positive_impact' | 'sociability' | 'reliability'
  | 'consistency' | 'proactivity' | 'habits' | 'communities';

export type TitleForm = 'neutral' | 'masculine' | 'feminine';
type L = { pt: string; en: string };

export const VOCATION_CATEGORIES: VocationCategory[] = [
  'leadership', 'collaboration', 'positive_impact', 'sociability', 'reliability',
  'consistency', 'proactivity', 'habits', 'communities',
];

export interface Occupation {
  emoji: string;
  /** Use {tag} as placeholder for tag-bound occupations. */
  name: Record<TitleForm, L>;
  phrase: L;
  criterion: L;
  badge: L;
}

const same = (pt: string, en: string): Record<TitleForm, L> => ({ neutral: { pt, en }, masculine: { pt, en }, feminine: { pt, en } });

export const OCCUPATIONS: Record<VocationCategory | 'taskmates', Occupation> = {
  leadership: {
    emoji: '🚩',
    name: { neutral: { pt: 'Mestre da Guilda', en: 'Guild Master' }, masculine: { pt: 'Mestre da Guilda', en: 'Guild Master' }, feminine: { pt: 'Mestre da Guilda', en: 'Guild Master' } },
    phrase: { pt: 'Você é reconhecido por liderar aventureiros.', en: 'You are known for leading adventurers.' },
    criterion: { pt: 'Reúna participantes diferentes numa tarefa criada por você.', en: 'Gather different participants in a task you created.' },
    badge: { pt: 'Liderança', en: 'Leadership' },
  },
  collaboration: {
    emoji: '🛡️',
    name: { neutral: { pt: 'Cavaleiro(a) Errante', en: 'Knight-Errant' }, masculine: { pt: 'Cavaleiro Errante', en: 'Knight-Errant' }, feminine: { pt: 'Cavaleira Errante', en: 'Knight-Errant' } },
    phrase: { pt: 'Você é o melhor em ajudar os mais necessitados.', en: 'You are the best at helping those in need.' },
    criterion: { pt: 'Conclua tarefas como colaborador(a) aprovado(a).', en: 'Complete tasks as an approved collaborator.' },
    badge: { pt: 'Colaboração', en: 'Collaboration' },
  },
  positive_impact: {
    emoji: '🌟',
    name: { neutral: { pt: 'Herói (Heroína)', en: 'Hero' }, masculine: { pt: 'Herói', en: 'Hero' }, feminine: { pt: 'Heroína', en: 'Heroine' } },
    phrase: { pt: 'O impacto de seus gestos é muito reconhecido e valorizado.', en: 'The impact of your deeds is widely recognized and valued.' },
    criterion: { pt: 'Receba curtidas numa tarefa concluída criada por você.', en: 'Get likes on a completed task you created.' },
    badge: { pt: 'Impacto Positivo', en: 'Positive Impact' },
  },
  sociability: {
    emoji: '🎻',
    name: same('Bardo da Taverna', 'Tavern Bard'),
    phrase: { pt: 'Suas histórias reúnem viajantes de todos os reinos.', en: 'Your stories gather travelers from every realm.' },
    criterion: { pt: 'Conquiste seguidores.', en: 'Gain followers.' },
    badge: { pt: 'Sociabilidade', en: 'Sociability' },
  },
  reliability: {
    emoji: '🕯️',
    name: { neutral: { pt: 'Sacerdote(isa)', en: 'Priest(ess)' }, masculine: { pt: 'Sacerdote', en: 'Priest' }, feminine: { pt: 'Sacerdotisa', en: 'Priestess' } },
    phrase: { pt: 'Suas ações impecáveis refletem sua nobreza.', en: 'Your flawless deeds reflect your nobility.' },
    criterion: { pt: 'Receba avaliações máximas seguidas.', en: 'Receive consecutive top ratings.' },
    badge: { pt: 'Confiabilidade', en: 'Reliability' },
  },
  consistency: {
    emoji: '🧘',
    name: same('Monge', 'Monk'),
    phrase: { pt: 'Você é exemplo de disciplina e autocontrole.', en: 'You are an example of discipline and self-control.' },
    criterion: { pt: 'Mantenha uma sequência numa tarefa repetida sua.', en: 'Keep a streak on one of your repeating tasks.' },
    badge: { pt: 'Consistência', en: 'Consistency' },
  },
  proactivity: {
    emoji: '🧭',
    name: { neutral: { pt: 'Explorador(a)', en: 'Explorer' }, masculine: { pt: 'Explorador', en: 'Explorer' }, feminine: { pt: 'Exploradora', en: 'Explorer' } },
    phrase: { pt: 'Você abre caminho antes que alguém peça.', en: 'You clear the path before anyone asks.' },
    criterion: { pt: 'Conclua ofertas suas com solicitantes aprovados.', en: 'Complete your offers with approved requesters.' },
    badge: { pt: 'Proatividade', en: 'Proactivity' },
  },
  habits: {
    emoji: '⚒️',
    name: { neutral: { pt: 'Artesã(o) Grão-Mestre de {tag}', en: 'Grandmaster Artisan of {tag}' }, masculine: { pt: 'Artesão Grão-Mestre de {tag}', en: 'Grandmaster Artisan of {tag}' }, feminine: { pt: 'Artesã Grã-Mestra de {tag}', en: 'Grandmaster Artisan of {tag}' } },
    phrase: { pt: 'Seu ofício atingiu o ápice técnico.', en: 'Your craft has reached its technical peak.' },
    criterion: { pt: 'Conclua tarefas com uma tag de habilidade.', en: 'Complete tasks with a skill tag.' },
    badge: { pt: 'Hábitos', en: 'Habits' },
  },
  communities: {
    emoji: '🏡',
    name: { neutral: { pt: 'Guardiã(o) da Vila {tag}', en: 'Guardian of the {tag} Village' }, masculine: { pt: 'Guardião da Vila {tag}', en: 'Guardian of the {tag} Village' }, feminine: { pt: 'Guardiã da Vila {tag}', en: 'Guardian of the {tag} Village' } },
    phrase: { pt: 'Você trabalha incansavelmente pelo bem da sua comunidade.', en: 'You work tirelessly for the good of your community.' },
    criterion: { pt: 'Conclua tarefas com uma tag de comunidade.', en: 'Complete tasks with a community tag.' },
    badge: { pt: 'Comunidades', en: 'Communities' },
  },
  taskmates: {
    emoji: '🤝',
    name: { neutral: { pt: 'Companheiro(a) de Aventuras de {tag}', en: 'Adventure Companion of {tag}' }, masculine: { pt: 'Companheiro de Aventuras de {tag}', en: 'Adventure Companion of {tag}' }, feminine: { pt: 'Companheira de Aventuras de {tag}', en: 'Adventure Companion of {tag}' } },
    phrase: { pt: 'Parceria fiel de batalha.', en: 'A loyal battle partnership.' },
    criterion: { pt: 'Faça 10+ tarefas com a mesma pessoa.', en: 'Do 10+ tasks with the same person.' },
    badge: { pt: 'Companheiros', en: 'Companions' },
  },
};

export function occupationName(category: VocationCategory | 'taskmates', lang: 'pt' | 'en', form: TitleForm = 'neutral', tag?: string | null): string {
  const raw = OCCUPATIONS[category].name[form][lang];
  return raw.replace('{tag}', tag?.trim() || (lang === 'pt' ? '…' : '…'));
}

export interface QuizAnswer { label: L; categories: VocationCategory[] }
export interface QuizQuestion { title: L; answers: QuizAnswer[] }

const A = (pt: string, en: string, ...categories: VocationCategory[]): QuizAnswer => ({ label: { pt, en }, categories });

export const GUILD_QUIZ: QuizQuestion[] = [
  { title: { pt: 'Você chega a uma vila em ruínas após um ataque. Qual é seu primeiro impulso?', en: 'You reach a village in ruins after an attack. What is your first impulse?' }, answers: [
    A('Reunir os moradores e propor um plano', 'Gather the villagers and propose a plan', 'leadership'),
    A('Arregaçar as mangas e ajudar quem já trabalha', 'Roll up my sleeves and help those already working', 'collaboration'),
    A('Usar seus talentos em algo que vai alegrar a todos', 'Use my talents on something that will cheer everyone up', 'positive_impact', 'habits'),
    A('Ser o porta-voz do que está acontecendo', 'Be the voice of what is happening', 'sociability'),
  ] },
  { title: { pt: 'Na fogueira da guilda, os amigos te chamam de…', en: 'Around the guild campfire, friends call you…' }, answers: [
    A('"Quem nunca falha"', '"The one who never fails"', 'reliability'),
    A('"Quem aparece todo dia"', '"The one who shows up every day"', 'consistency'),
    A('"Quem já resolveu antes de pedirem"', '"The one who solved it before anyone asked"', 'proactivity'),
    A('"Quem conhece todo mundo"', '"The one who knows everybody"', 'sociability'),
  ] },
  { title: { pt: 'Se pudesse ter um superpoder, qual seria?', en: 'If you could have a superpower, what would it be?' }, answers: [
    A('Inspirar coragem em qualquer grupo', 'Inspire courage in any group', 'leadership'),
    A('Fazer florescer tudo que toco', 'Make everything I touch bloom', 'positive_impact'),
    A('Nunca cansar, todos os dias', 'Never get tired, every single day', 'consistency'),
    A('Dominar qualquer ofício em segundos', 'Master any craft in seconds', 'habits'),
  ] },
  { title: { pt: 'Como você prefere ganhar EXP?', en: 'How do you prefer to earn EXP?' }, answers: [
    A('Treinando meu ofício', 'Training my craft', 'habits'),
    A('Fortalecendo minha comunidade', 'Strengthening my community', 'communities'),
    A('Completando missões em equipe', 'Completing quests as a team', 'collaboration'),
    A('Oferecendo ajuda antes que peçam', 'Offering help before anyone asks', 'proactivity'),
  ] },
  { title: { pt: 'Um dragão de poluição ameaça o rio. Seu papel na batalha:', en: 'A pollution dragon threatens the river. Your role in battle:' }, answers: [
    A('Comandar a estratégia', 'Command the strategy', 'leadership'),
    A('Proteger os moradores da vila', 'Protect the villagers', 'communities'),
    A('Cumprir sem falhas a missão que me derem', 'Carry out my mission flawlessly', 'reliability'),
    A('Explorar a nascente e achar a origem do problema', 'Explore the spring and find the source of the problem', 'proactivity'),
  ] },
  { title: { pt: 'Quanto tempo de aventura você tem por semana?', en: 'How much adventure time do you have per week?' }, answers: [
    A('Um pouco todo dia', 'A little every day', 'consistency', 'habits'),
    A('Uma grande missão por semana', 'One big quest per week', 'leadership', 'positive_impact'),
    A('Quando um amigo chama', 'Whenever a friend calls', 'collaboration', 'sociability'),
    A('Varia, mas sempre cumpro o que prometo', 'It varies, but I always keep my promises', 'reliability'),
  ] },
  { title: { pt: 'Qual recompensa te faria sorrir mais?', en: 'Which reward would make you smile the most?' }, answers: [
    A('Ver o pomar que plantei cheio de vida', 'Seeing the orchard I planted full of life', 'positive_impact'),
    A('Avaliação 5 estrelas de quem ajudei', 'A 5-star rating from someone I helped', 'reliability'),
    A('Novos seguidores na minha jornada', 'New followers on my journey', 'sociability'),
    A('Ver meus companheiros com suas necessidades supridas', 'Seeing my companions with their needs met', 'communities'),
  ] },
  { title: { pt: 'Chegou o fim de semana e você tem um tempo livre. O que costuma fazer?', en: 'The weekend is here and you have some free time. What do you usually do?' }, answers: [
    A('Encontrar amigos, ir a um evento ou puxar conversa com gente nova', 'Meet friends, go to an event or chat with new people', 'sociability'),
    A('Manter minha rotina: treino, estudo ou prática de sempre', 'Keep my routine: workout, study or usual practice', 'consistency'),
    A('Adiantar coisas que sei que vão precisar ser feitas, em casa ou no trabalho', 'Get ahead on things that will need doing, at home or work', 'proactivity'),
    A('Ir a uma feira, mutirão ou ação do bairro', 'Go to a market, community work day or neighborhood action', 'communities'),
  ] },
  { title: { pt: 'Um colega ou vizinho está sobrecarregado. O que você faz?', en: 'A colleague or neighbor is overwhelmed. What do you do?' }, answers: [
    A('Ofereço ajuda e divido as tarefas com ele', 'Offer help and share the tasks with them', 'collaboration'),
    A('Assumo uma parte e entrego exatamente no prazo combinado', 'Take a part and deliver exactly on the agreed deadline', 'reliability'),
    A('Mostro um jeito mais fácil de fazer, usando o que sei', 'Show an easier way to do it, using what I know', 'habits'),
    A('Passo a ajudar um pouquinho toda semana, até ele se equilibrar', 'Help a little every week until they get back on track', 'consistency'),
  ] },
];

export type VocationScores = Record<VocationCategory, number>;

export function scoreAnswers(answerIndexes: number[]): VocationScores {
  const scores = Object.fromEntries(VOCATION_CATEGORIES.map(c => [c, 0])) as VocationScores;
  answerIndexes.forEach((ai, qi) => {
    const answer = GUILD_QUIZ[qi]?.answers[ai];
    answer?.categories.forEach(c => { scores[c] += 1; });
  });
  return scores;
}

/**
 * Ranks vocations by score. Ties go to the category closest to its next badge level
 * (`remaining` = points still missing), then to the fixed category order.
 */
export function rankVocations(scores: VocationScores, remaining: Partial<Record<VocationCategory, number>> = {}): VocationCategory[] {
  return [...VOCATION_CATEGORIES].sort((a, b) =>
    (scores[b] - scores[a])
    || ((remaining[a] ?? Number.MAX_SAFE_INTEGER) - (remaining[b] ?? Number.MAX_SAFE_INTEGER))
    || (VOCATION_CATEGORIES.indexOf(a) - VOCATION_CATEGORIES.indexOf(b)));
}

export const needsTag = (c: VocationCategory) => c === 'habits' || c === 'communities';


/** Personal journey steps built only from existing journey actions, so the database evaluates progress. */
export function buildJourneySteps(category: VocationCategory, tagId?: string | null, lang: 'pt' | 'en' = 'pt'): JourneyStepInput[] {
  const tags = tagId ? [tagId] : [];
  const t = (pt: string) => (lang === 'pt' ? pt : STEP_EN[pt] ?? pt);
  switch (category) {
    case 'leadership': return [
      { title: t('Convoque sua guilda: crie uma tarefa coletiva'), action: 'create', item_kind: 'task' },
      { title: t('Lidere até o fim com 3+ participantes'), action: 'complete', item_kind: 'task', indicators: [{ metric: 'participants', op: 'gte', value: 3 }] },
    ];
    case 'collaboration': return [
      { title: t('Junte-se à missão de outra pessoa'), action: 'participate', item_kind: 'task' },
      { title: t('Conclua a colaboração'), action: 'complete', item_kind: 'task' },
      { title: t('Avalie quem você ajudou'), action: 'rate', item_kind: 'task' },
    ];
    case 'positive_impact': return [
      { title: t('Crie uma tarefa de impacto'), action: 'create', item_kind: 'task' },
      { title: t('Conclua com prova real'), action: 'complete', item_kind: 'task', indicators: [{ metric: 'proofs', op: 'gte', value: 1 }] },
      { title: t('Seja aclamado: 3+ curtidas numa tarefa concluída'), action: 'complete', item_kind: 'task', indicators: [{ metric: 'likes', op: 'gte', value: 3 }] },
    ];
    case 'sociability': return [
      { title: t('Faça amizade: siga uma pessoa'), action: 'follow_person', item_kind: 'person' },
      { title: t('Conte histórias: comente numa tarefa'), action: 'comment', item_kind: 'task' },
      { title: t('Dê sua voz: comente numa opinião'), action: 'comment', item_kind: 'poll' },
    ];
    case 'reliability': return [
      { title: t('Aceite uma missão'), action: 'participate', item_kind: 'task' },
      { title: t('Cumpra sem falhas: conclua com nota 5'), action: 'complete', item_kind: 'task', indicators: [{ metric: 'avg_rating', op: 'gte', value: 5 }] },
    ];
    case 'consistency': return [
      { title: t('Crie um ritual: tarefa pessoal'), action: 'create', item_kind: 'task', item_type: 'personal' },
      { title: t('Pratique: conclua uma tarefa pessoal'), action: 'complete', item_kind: 'task', item_type: 'personal' },
      { title: t('Pratique de novo: conclua outra tarefa pessoal'), action: 'complete', item_kind: 'task', item_type: 'personal' },
    ];
    case 'proactivity': return [
      { title: t('Abra caminho: crie uma oferta'), action: 'create', item_kind: 'task', item_type: 'offer' },
      { title: t('Conclua a oferta com alguém'), action: 'complete', item_kind: 'task', item_type: 'offer', indicators: [{ metric: 'participants', op: 'gte', value: 1 }] },
    ];
    case 'habits':
    case 'communities': return [
      { title: t(category === 'habits' ? 'Escolha seu ofício: siga a tag' : 'Proteja sua vila: siga a tag'), action: 'follow_tag', item_kind: 'tag', tag_category: category === 'habits' ? 'skills' : 'communities', tag_ids: tags },
      { title: t('Crie uma tarefa com essa tag'), action: 'create', item_kind: 'task', tag_ids: tags },
      { title: t('Conclua uma tarefa com essa tag'), action: 'complete', item_kind: 'task', tag_ids: tags },
    ];
  }
}

const STEP_EN: Record<string, string> = {
  'Convoque sua guilda: crie uma tarefa coletiva': 'Rally your guild: create a group task',
  'Lidere até o fim com 3+ participantes': 'Lead to the end with 3+ participants',
  'Junte-se à missão de outra pessoa': "Join someone else's quest",
  'Conclua a colaboração': 'Complete the collaboration',
  'Avalie quem você ajudou': 'Rate the person you helped',
  'Crie uma tarefa de impacto': 'Create an impact task',
  'Conclua com prova real': 'Complete it with real proof',
  'Seja aclamado: 3+ curtidas numa tarefa concluída': 'Be acclaimed: 3+ likes on a completed task',
  'Faça amizade: siga uma pessoa': 'Make a friend: follow a person',
  'Conte histórias: comente numa tarefa': 'Tell stories: comment on a task',
  'Dê sua voz: comente numa opinião': 'Raise your voice: comment on an opinion',
  'Aceite uma missão': 'Accept a quest',
  'Cumpra sem falhas: conclua com nota 5': 'Flawless: complete with a 5-star rating',
  'Crie um ritual: tarefa pessoal': 'Create a ritual: personal task',
  'Pratique: conclua uma tarefa pessoal': 'Practice: complete a personal task',
  'Pratique de novo: conclua outra tarefa pessoal': 'Practice again: complete another personal task',
  'Abra caminho: crie uma oferta': 'Clear the path: create an offer',
  'Conclua a oferta com alguém': 'Complete the offer with someone',
  'Escolha seu ofício: siga a tag': 'Choose your craft: follow the tag',
  'Proteja sua vila: siga a tag': 'Protect your village: follow the tag',
  'Crie uma tarefa com essa tag': 'Create a task with this tag',
  'Conclua uma tarefa com essa tag': 'Complete a task with this tag',
};
