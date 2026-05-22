/**
 * ELIZA-inspired conversational engine for Capy Vera.
 * Pure rule-based pattern matching — no LLMs involved.
 *
 * Based on Joseph Weizenbaum's ELIZA (1966), adapted to the TaskMates context
 * of regenerative behavior, mutual aid, self-care and environmental stewardship.
 */

export type ElizaIntent =
  | 'none'
  | 'suggest_personal_task'
  | 'suggest_offer_task'
  | 'suggest_request_task'
  | 'suggest_goal'
  | 'open_journal'
  | 'praise'
  | 'out_of_scope';

export interface ElizaReply {
  text: string;
  intent: ElizaIntent;
  /** Extracted phrase (e.g. the activity the user mentioned). */
  payload?: string;
}

interface Rule {
  keyword: string;
  priority: number;
  patterns: {
    regex: RegExp;
    responses: string[];
    intent?: ElizaIntent;
  }[];
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

/** Pronoun reflection for Portuguese (eu→você, meu→seu, etc.). */
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
  // Greetings & meta
  {
    keyword: 'ola',
    priority: 1,
    patterns: [
      {
        regex: /\b(oi|ola|hey|bom dia|boa tarde|boa noite|opa)\b/,
        responses: [
          'Olá! Sou a Capy Vera 🌿 Como foi seu dia hoje?',
          'Oi! Que bom te ver. O que você nutriu hoje — em você, em alguém ou no ambiente?',
          'Oi! Conta pra mim: tem alguma atividade rondando sua cabeça?',
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
          'Imagina! Estou aqui pra te ajudar a perceber o que já está fazendo.',
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
          'Sou a Capy Vera, uma capivara curiosa que conversa com você sobre o que está fazendo, querendo e oferecendo. Inspirada na ELIZA (1966), funciono por padrões — sem nenhuma IA generativa.',
          'Sou a Capy Vera 🌿 Te ajudo a transformar conversa em tarefas pessoais, ofertas e pedidos no TaskMates.',
        ],
      },
    ],
  },

  // Journaling
  {
    keyword: 'dia',
    priority: 3,
    patterns: [
      {
        regex: /\b(meu dia foi|hoje (eu )?(fui|fiz|tive)|hoje foi)\b\s*(.*)/,
        responses: [
          'Que bom registrar isso. Conta mais: o que mais aconteceu $4?',
          'Entendi. E como você se sentiu fazendo isso?',
          'Bonito. Tem alguma dessas coisas que merece virar uma tarefa no seu perfil?',
        ],
        intent: 'open_journal',
      },
    ],
  },

  // Actions → personal task
  {
    keyword: 'fiz',
    priority: 10,
    patterns: [
      {
        regex: /\b(eu )?(fiz|terminei|conclui|finalizei|completei)\s+(.+)/,
        responses: [
          'Quer registrar "$3" como tarefa pessoal concluída? Isso ajuda a equilibrar seu balanço de oferta, pedido e pessoal.',
          'Belo passo! Posso te sugerir adicionar "$3" como tarefa pessoal — assim o motor de recomendação aprende sobre você.',
        ],
        intent: 'suggest_personal_task',
      },
    ],
  },
  {
    keyword: 'estou fazendo',
    priority: 9,
    patterns: [
      {
        regex: /\b(estou|to|tou)\s+(fazendo|estudando|cuidando|aprendendo|praticando|escrevendo|cozinhando|plantando|cultivando|lendo|treinando)\s+(.+)/,
        responses: [
          'Que tal transformar "$2 $3" em uma tarefa pessoal pra acompanhar sua jornada?',
          'Posso te ajudar a adicionar "$2 $3" como tarefa pessoal — assim eu lembro de você nisso.',
        ],
        intent: 'suggest_personal_task',
      },
    ],
  },

  // Skill / passion → offer
  {
    keyword: 'gosto',
    priority: 8,
    patterns: [
      {
        regex: /\b(gosto de|amo|adoro|me apaixono por|me encanta)\s+(.+)/,
        responses: [
          'Lindo! Já pensou em oferecer "$2" pra sua comunidade? Quem sabe alguém perto de você se beneficia.',
          'Sua paixão por "$2" pode virar uma oferta no TaskMates — assim outras pessoas descobrem que podem contar com você.',
        ],
        intent: 'suggest_offer_task',
      },
    ],
  },
  {
    keyword: 'sei',
    priority: 7,
    patterns: [
      {
        regex: /\b(sei|consigo|sou bom em|sou boa em|tenho habilidade)\s+(.+)/,
        responses: [
          'Habilidade boa! Topa publicar "$2" como uma oferta?',
          'Que tal compartilhar "$2" com seus vizinhos do TaskMates como oferta?',
        ],
        intent: 'suggest_offer_task',
      },
    ],
  },

  // Needs → request
  {
    keyword: 'preciso',
    priority: 9,
    patterns: [
      {
        regex: /\b(preciso de|estou precisando de|me ajuda(ria)? com|necessito de)\s+(.+)/,
        responses: [
          'Posso te ajudar a publicar "$3" como um pedido. Pedir ajuda também é nutrir vida.',
          'Compartilhar "$3" como pedido aumenta as chances de alguém com essa habilidade aparecer pra colaborar.',
        ],
        intent: 'suggest_request_task',
      },
      {
        regex: /\bpreciso\s+(.+)/,
        responses: ['Que tal transformar "$1" em um pedido público? Pedir é parte do jogo.'],
        intent: 'suggest_request_task',
      },
    ],
  },
  {
    keyword: 'queria',
    priority: 6,
    patterns: [
      {
        regex: /\b(queria|gostaria de|quero)\s+(.+)/,
        responses: [
          'O que te impede de começar com "$2"?',
          '"$2" parece importante pra você. Quer que vire uma meta no seu perfil?',
        ],
        intent: 'suggest_goal',
      },
    ],
  },

  // Feelings
  {
    keyword: 'cansado',
    priority: 5,
    patterns: [
      {
        regex: /\b(cansad[oa]|exaust[oa]|sem energia|esgotad[oa])\b/,
        responses: [
          'Descanso também é nutrir vida. Que cuidado simples você pode oferecer a si hoje?',
          'Você tem se permitido pausar? Pode registrar "descansar" como tarefa pessoal — vale ouro.',
        ],
        intent: 'suggest_personal_task',
      },
    ],
  },
  {
    keyword: 'triste',
    priority: 5,
    patterns: [
      {
        regex: /\b(triste|chate[ao]d[oa]|deprimid[oa]|para baixo|abatid[oa])\b/,
        responses: [
          'Sinto muito. Quer me contar mais sobre o que te deixou assim?',
          'Tem alguém da sua rede que você pode chamar agora? Conexão é remédio.',
        ],
      },
    ],
  },
  {
    keyword: 'feliz',
    priority: 5,
    patterns: [
      {
        regex: /\b(feliz|content[ea]|alegre|animad[oa]|empolgad[oa])\b/,
        responses: [
          'Que delícia! O que está alimentando essa alegria?',
          'Adoro saber. Quer registrar isso como conquista pessoal?',
        ],
        intent: 'praise',
      },
    ],
  },

  // Community / environment
  {
    keyword: 'comunidade',
    priority: 6,
    patterns: [
      {
        regex: /\b(comunidade|vizinhanca|bairro|coletivo|grupo)\b/,
        responses: [
          'Sua comunidade tem muito a ganhar com o que você sabe fazer. Já pensou numa oferta ligada a isso?',
          'Quem da sua comunidade você gostaria de envolver? Posso te ajudar a transformar isso em tarefa.',
        ],
      },
    ],
  },
  {
    keyword: 'planeta',
    priority: 6,
    patterns: [
      {
        regex: /\b(planeta|natureza|ambiente|terra|ecologic[oa]|sustentavel|regenerativ[oa])\b/,
        responses: [
          'Cuidar do ambiente é a terceira dimensão do TaskMates. Que ação concreta você faria essa semana?',
          'Belíssimo. Quer registrar uma tarefa de stewardship ambiental?',
        ],
        intent: 'suggest_personal_task',
      },
    ],
  },

  // Refusal / acceptance
  {
    keyword: 'nao sei',
    priority: 4,
    patterns: [
      {
        regex: /\b(nao sei|sei la|nem ideia)\b/,
        responses: [
          'Tudo bem não saber. Vamos por partes: o que você fez hoje, mesmo pequeno?',
          'Se pudesse fazer uma única coisa amanhã pra você se sentir bem, qual seria?',
        ],
      },
    ],
  },
  {
    keyword: 'nao',
    priority: 2,
    patterns: [
      {
        regex: /^(nao|nope|hoje nao|depois)\s*$/,
        responses: ['Tranquilo. Quando quiser, é só voltar aqui.', 'Sem pressa. Quer falar de outra coisa?'],
      },
    ],
  },
  {
    keyword: 'sim',
    priority: 2,
    patterns: [
      {
        regex: /^(sim|claro|pode ser|bora|vamos)\s*$/,
        responses: [
          'Boa! Me conta mais detalhes pra eu te ajudar melhor.',
          'Então me diz: qual o título você daria pra essa tarefa?',
        ],
      },
    ],
  },

  // Meta / app
  {
    keyword: 'como funciona',
    priority: 6,
    patterns: [
      {
        regex: /\b(como funciona|o que e taskmates|como uso)\b/,
        responses: [
          'TaskMates é um espaço pra autocuidado, ajuda mútua e cuidado com o ambiente. Você cria tarefas pessoais, ofertas e pedidos, e o motor de recomendação conecta você a quem tem afinidade.',
          'Pensa em mim como uma capivara que te lembra: tudo o que você faz pode virar tarefa, e cada tarefa pode te conectar com alguém.',
        ],
      },
    ],
  },
];

const FALLBACKS: string[] = [
  'Me conta um pouco mais sobre isso.',
  'Como você se sente em relação a isso?',
  'Por que isso é importante pra você agora?',
  'E o que você gostaria de fazer com isso?',
  'Interessante. Isso poderia virar uma tarefa pessoal, uma oferta ou um pedido?',
  'Lembra de alguém da sua comunidade que se importa com isso também?',
  'Se você desse o primeiro passo amanhã, qual seria?',
  'O que te impede de começar?',
];

const MEMORY: string[] = [];
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

/** Detects direct commands, factual questions, advice requests and code/math tasks
 *  that a pattern-based engine cannot meaningfully answer. */
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  // Imperatives addressed to Capy
  /\b(me )?(diga|fala|conta|explica|explique|descreva|defina|liste|enumere|resuma|resume|traduza|traduz|corrija|corrige|reescreva|reescreve|escreva|escreve|redija|redige|crie|cria|gere|gera|calcula|calcule|resolve|resolva|programa|programe|codifica|codifique|pesquisa|pesquise|busca|busque|procura|procure|recomenda|recomende|aconselha|aconselhe|sugere|sugira|ensina|ensine|prova|prove|demonstra|demonstre|compara|compare|analisa|analise)\b/,
  // Factual / encyclopedic questions
  /\b(qual (e|eh|sera|seria|foi)|quais sao|quem (e|eh|foi|inventou|criou|descobriu)|quando (foi|aconteceu|ocorreu)|onde (fica|esta|aconteceu)|por que|porque|como (faco|faz|fazer|funciona o|se faz|posso fazer)|quanto (custa|vale|pesa|mede))\b/,
  // Math / code / translation requests
  /(\d+\s*[\+\-\*x\/]\s*\d+|traduz(a|ir)?\s+para|in english|em ingles|escreva (um|uma) (codigo|programa|funcao|script|email|texto|poema|artigo|post|resumo))/,
  // Asking Capy for opinions / predictions / advice she shouldn't give
  /\b(o que (voce )?(acha|pensa|recomenda|sugere|me aconselha)|qual sua opiniao|o que devo (fazer|escolher|comprar|estudar|comer|vestir)|me ajuda a decidir|me da um conselho|tenho razao|estou certo|estou errado)\b/,
];

const OUT_OF_SCOPE_RESPONSES: string[] = [
  'Ó, sou só uma capivara de padrões 🌿 — não consigo responder isso com a profundidade que você merece. Que tal levar essa conversa pra um amigo ou amiga de confiança? Conexão humana costuma trazer respostas melhores. Se quiser, posso te ajudar a transformar isso numa tarefa pessoal, oferta ou pedido aqui no TaskMates.',
  'Essa é uma pergunta linda, mas grande demais pra mim — eu só converso por padrões simples, sem IA generativa. Sugiro chamar alguém de verdade pra trocar ideia. Enquanto isso, posso te ajudar a registrar o que está sentindo ou planejando aqui no app.',
  'Não tenho como te dar uma resposta confiável pra isso (sou uma ELIZA capivarinha 🐹🌱). Que tal mandar uma mensagem pra um amigo real? E se quiser, depois volta aqui pra transformar a conversa em uma tarefa, oferta ou pedido.',
  'Pra esse tipo de pergunta, nada substitui um papo com alguém querido. Eu funciono melhor te ajudando a perceber o que você está fazendo, querendo ou oferecendo. Quer tentar por esse caminho?',
];

function isOutOfScope(text: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((re) => re.test(text));
}

/**
 * Main entry. Returns Capy Vera's reply plus an optional intent
 * the UI can act on (e.g. show a CTA to publish as offer/request/personal).
 */
export function respond(input: string): ElizaReply {
  const raw = input.trim();
  if (!raw) {
    if (MEMORY.length > 0) {
      return { text: `Antes você mencionou "${MEMORY.pop()}". Quer voltar nisso?`, intent: 'none' };
    }
    return { text: pickFallback(), intent: 'none' };
  }

  const text = normalize(raw);
  const sorted = [...RULES].sort((a, b) => b.priority - a.priority);

  // Try thematic rules first — they take precedence when the user is
  // genuinely sharing something (fiz, preciso, gosto, etc.).
  for (const rule of sorted) {
    for (const pat of rule.patterns) {
      const m = text.match(pat.regex);
      if (m) {
        const reply = fillTemplate(pick(pat.responses), m);
        const captured = m[m.length - 1];
        if (captured && captured.length > 2 && captured.length < 80) {
          MEMORY.push(reflect(captured));
          if (MEMORY.length > 5) MEMORY.shift();
        }
        return {
          text: reply,
          intent: pat.intent ?? 'none',
          payload: captured ? reflect(captured) : undefined,
        };
      }
    }
  }

  // No thematic rule matched. If the input looks like a direct command,
  // factual question or advice request, deflect to a real friend.
  if (isOutOfScope(text)) {
    return { text: pick(OUT_OF_SCOPE_RESPONSES), intent: 'out_of_scope' };
  }

  return { text: pickFallback(), intent: 'none' };
}

export function greet(): string {
  const hour = new Date().getHours();
  const period =
    hour < 6 ? 'boa madrugada' : hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite';
  return `Oi, ${period}! Sou a Capy Vera 🌿 Sou uma capivara conversacional baseada em padrões (ELIZA, 1966) — sem IA generativa. Me conta: o que você fez hoje, o que está querendo, ou o que sabe oferecer?`;
}
