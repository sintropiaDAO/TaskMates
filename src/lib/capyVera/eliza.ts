/**
 * ELIZA-inspired conversational engine for Capy Vera.
 * Pure rule-based pattern matching — no LLMs involved.
 *
 * Based on Joseph Weizenbaum's ELIZA (1966), adapted to the TaskMates context
 * of regenerative behavior, mutual aid, self-care and environmental stewardship.
 */

export type ElizaIntent = 'none' | 'praise' | 'out_of_scope' | 'reflect';

export interface ElizaReply {
  text: string;
  intent: ElizaIntent;
}

interface Rule {
  keyword: string;
  priority: number;
  patterns: { regex: RegExp; responses: string[]; intent?: ElizaIntent }[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[!?.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const REFLECTIONS: Array<[RegExp, string]> = [
  [/\bsou\b/g, 'é'],
  [/\beu\b/g, 'você'],
  [/\bmim\b/g, 'você'],
  [/\bme\b/g, 'te'],
  [/\bmeu\b/g, 'seu'],
  [/\bminha\b/g, 'sua'],
  [/\bmeus\b/g, 'seus'],
  [/\bminhas\b/g, 'suas'],
  [/\bestou\b/g, 'está'],
  [/\bcomigo\b/g, 'com você'],
];

function reflect(fragment: string): string {
  let out = ' ' + fragment.trim() + ' ';
  for (const [re, rep] of REFLECTIONS) out = out.replace(re, rep);
  return out.trim();
}

const RULES: Rule[] = [
  {
    keyword: 'ola',
    priority: 1,
    patterns: [
      {
        regex: /\b(oi|ola|hey|bom dia|boa tarde|boa noite|opa)\b/,
        responses: [
          'Olá! Sou a Capy Vera 🌿',
          'Oi! Que bom te ver.',
          'Oi! Tô por aqui.',
        ],
      },
    ],
  },
  {
    keyword: 'obrigado',
    priority: 1,
    patterns: [
      {
        regex: /\b(obrigad[oa]|valeu|agradec)/,
        responses: [
          'Imagina! Tô aqui pra te ajudar a perceber o que já está fazendo.',
          'Eu que agradeço por compartilhar.',
        ],
      },
    ],
  },
  {
    keyword: 'capy',
    priority: 1,
    patterns: [
      {
        regex: /\b(quem (e|es) voce|o que voce faz|capy vera|capivera)\b/,
        responses: [
          'Sou a Capy Vera, uma capivara curiosa inspirada na ELIZA (1966) — converso por padrões, sem IA generativa.',
          'Sou a Capy Vera 🌿 Te ajudo a refletir sobre o que faz, quer e oferece.',
        ],
      },
    ],
  },
  {
    keyword: 'fiz',
    priority: 10,
    patterns: [
      {
        regex: /\b(eu )?(fiz|terminei|conclui|finalizei|completei)\s+(.+)/,
        responses: ['Que bom que concluiu "$3". Como você se sentiu?', '"$3" — belo passo.'],
        intent: 'reflect',
      },
    ],
  },
  {
    keyword: 'estou fazendo',
    priority: 9,
    patterns: [
      {
        regex: /\b(estou|to|tou)\s+(fazendo|estudando|cuidando|aprendendo|praticando|escrevendo|cozinhando|plantando|cultivando|lendo|treinando)\s+(.+)/,
        responses: ['"$2 $3" parece importante pra você.', 'Conta mais sobre $2 $3.'],
        intent: 'reflect',
      },
    ],
  },
  {
    keyword: 'gosto',
    priority: 8,
    patterns: [
      {
        regex: /\b(gosto de|amo|adoro|me apaixono por|me encanta)\s+(.+)/,
        responses: ['Lindo gostar de "$2".', 'Sua paixão por "$2" tem algo a te dizer.'],
        intent: 'reflect',
      },
    ],
  },
  {
    keyword: 'preciso',
    priority: 9,
    patterns: [
      {
        regex: /\b(preciso de|estou precisando de|necessito de)\s+(.+)/,
        responses: ['Pedir "$2" também é nutrir vida.', '"$2" é algo que você tem buscado.'],
        intent: 'reflect',
      },
    ],
  },
  {
    keyword: 'queria',
    priority: 6,
    patterns: [
      {
        regex: /\b(queria|gostaria de|quero)\s+(.+)/,
        responses: ['"$2" parece importante pra você.', 'Imagina como seria realizar "$2".'],
        intent: 'reflect',
      },
    ],
  },
  {
    keyword: 'cansado',
    priority: 5,
    patterns: [
      {
        regex: /\b(cansad[oa]|exaust[oa]|sem energia|esgotad[oa])\b/,
        responses: ['Descanso também é nutrir vida.', 'Sinto que você está pedindo pausa.'],
      },
    ],
  },
  {
    keyword: 'triste',
    priority: 5,
    patterns: [
      {
        regex: /\b(triste|chate[ao]d[oa]|deprimid[oa]|para baixo|abatid[oa])\b/,
        responses: ['Sinto muito que esteja assim.', 'Estou aqui pra te ouvir.'],
      },
    ],
  },
  {
    keyword: 'feliz',
    priority: 5,
    patterns: [
      {
        regex: /\b(feliz|content[ea]|alegre|animad[oa]|empolgad[oa])\b/,
        responses: ['Que delícia saber disso!', 'Adoro essa energia.'],
        intent: 'praise',
      },
    ],
  },
  {
    keyword: 'nao sei',
    priority: 4,
    patterns: [
      {
        regex: /\b(nao sei|sei la|nem ideia)\b/,
        responses: ['Tudo bem não saber.', 'Vamos por partes, sem pressa.'],
      },
    ],
  },
];

/** Inspiring questions Capy Vera always adds at the end of her replies. */
const DEFAULT_QUESTIONS: string[] = [
  'What are you good at?',
  'What gifts would you like to share?',
  'What skills have you proudly developed?',
  'What are the things you love doing?',
  'What skills are you recognized for?',
  'What habits would you happily help others build?',
  'What activities spark your interest and get you in the flow state?',
  'What would you work with if money was not a goal or a problem?',
  'What skills would you like to develop?',
  'What activities make you feel productive?',
  'How do you like to spend your free time?',
  'What causes are you passionate about and inspire you to take action?',
  'What subjects do you love to read about, study, or stay informed on?',
  'What subjects could you give lectures on?',
  'What topics do you like to discuss and share your ideas?',
  'What type of content would you spend hours talking about?',
  'What topics spark your creativity and imagination?',
  'What improvements would you like to see in your life or community?',
  'What tasks do you need help with?',
  'What issues do you need help solving?',
  'What are your goals for the future?',
  'What dreams did you give up on due to lack of support?',
  'Do you have any bad habits you need help to overcome?',
  'What tasks do you consider crucial for your happiness and leisure?',
];

let questionPool: string[] = [...DEFAULT_QUESTIONS];
const recentQuestions: string[] = [];

export function setQuestionPool(questions: string[]) {
  const merged = Array.from(new Set([...questions, ...DEFAULT_QUESTIONS])).filter(Boolean);
  questionPool = merged.length > 0 ? merged : [...DEFAULT_QUESTIONS];
}

function pickQuestion(): string {
  const fresh = questionPool.filter((q) => !recentQuestions.includes(q));
  const candidates = fresh.length > 0 ? fresh : questionPool;
  const q = candidates[Math.floor(Math.random() * candidates.length)];
  recentQuestions.push(q);
  if (recentQuestions.length > Math.min(8, Math.floor(questionPool.length / 2))) {
    recentQuestions.shift();
  }
  return q;
}

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\b(me )?(diga|fala|conta|explica|explique|descreva|defina|liste|enumere|resuma|resume|traduza|traduz|corrija|corrige|reescreva|reescreve|escreva|escreve|redija|redige|crie|cria|gere|gera|calcula|calcule|resolve|resolva|programa|programe|codifica|codifique|pesquisa|pesquise|busca|busque|procura|procure|recomenda|recomende|aconselha|aconselhe|sugere|sugira|ensina|ensine|prova|prove|demonstra|demonstre|compara|compare|analisa|analise)\b/,
  /\b(qual (e|eh|sera|seria|foi)|quais sao|quem (e|eh|foi|inventou|criou|descobriu)|quando (foi|aconteceu|ocorreu)|onde (fica|esta|aconteceu)|por que|porque|como (faco|faz|fazer|funciona o|se faz|posso fazer)|quanto (custa|vale|pesa|mede))\b/,
  /(\d+\s*[\+\-\*x\/]\s*\d+|traduz(a|ir)?\s+para|in english|em ingles|escreva (um|uma) (codigo|programa|funcao|script|email|texto|poema|artigo|post|resumo))/,
  /\b(o que (voce )?(acha|pensa|recomenda|sugere|me aconselha)|qual sua opiniao|o que devo (fazer|escolher|comprar|estudar|comer|vestir)|me ajuda a decidir|me da um conselho|tenho razao|estou certo|estou errado)\b/,
];

const OUT_OF_SCOPE_RESPONSES: string[] = [
  'Ó, sou só uma capivara de padrões 🌿 — não consigo responder isso com a profundidade que você merece. Que tal levar essa conversa pra um amigo ou amiga de confiança?',
  'Essa é uma pergunta linda, mas grande demais pra mim — eu só converso por padrões simples, sem IA generativa. Sugiro chamar alguém de verdade pra trocar ideia.',
  'Não tenho como te dar uma resposta confiável pra isso (sou uma ELIZA capivarinha 🐹🌱). Manda mensagem pra um amigo real e depois volta aqui.',
  'Pra esse tipo de pergunta, nada substitui um papo com alguém querido. Eu funciono melhor te ajudando a perceber o que está fazendo, querendo ou oferecendo.',
];

const FALLBACKS: string[] = [
  'Me conta um pouco mais sobre isso.',
  'Interessante.',
  'Entendo.',
  'Hmm, conta mais.',
  'Tô te ouvindo.',
];

let lastFallbackIndex = -1;
function pickFallback(): string {
  let i = Math.floor(Math.random() * FALLBACKS.length);
  if (i === lastFallbackIndex) i = (i + 1) % FALLBACKS.length;
  lastFallbackIndex = i;
  return FALLBACKS[i];
}

function fillTemplate(template: string, match: RegExpMatchArray): string {
  return template.replace(/\$(\d+)/g, (_, n) => {
    const raw = match[Number(n)] ?? '';
    return reflect(raw);
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function withQuestion(text: string): string {
  return `${text.trim()}\n\n${pickQuestion()}`;
}

export function respond(input: string): ElizaReply {
  const raw = input.trim();
  if (!raw) return { text: withQuestion(pickFallback()), intent: 'none' };

  const text = normalize(raw);
  const sorted = [...RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    for (const pat of rule.patterns) {
      const m = text.match(pat.regex);
      if (m) {
        const reply = fillTemplate(pick(pat.responses), m);
        return { text: withQuestion(reply), intent: pat.intent ?? 'none' };
      }
    }
  }

  if (OUT_OF_SCOPE_PATTERNS.some((re) => re.test(text))) {
    return { text: withQuestion(pick(OUT_OF_SCOPE_RESPONSES)), intent: 'out_of_scope' };
  }

  return { text: withQuestion(pickFallback()), intent: 'none' };
}

export function greet(): string {
  const hour = new Date().getHours();
  const period =
    hour < 6 ? 'boa madrugada' : hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite';
  return `Oi, ${period}! Sou a Capy Vera 🌿 Conversa baseada em padrões (ELIZA, 1966) — sem IA generativa.\n\n${pickQuestion()}`;
}
