# Capy Vera — mascote e chat estilo ELIZA (sem LLM)

Construir a Capy Vera como assistente conversacional **100% baseado em regras** (pattern matching estilo ELIZA, 1966), sem chamadas a nenhuma LLM. A persona e os disparadores seguem o que o artigo descreve: ELIZA aumentada, mascote capivara fofa, princípios persuasivos de *praise*, *suggestion*, *reduction* e *social actor*.

## O que será entregue

1. **Mascote visual** — ilustração de uma capivara amigável (já gerada em `src/assets/capy-vera-mascot.png`) usada no FAB e no cabeçalho do chat.
2. **Motor ELIZA em TypeScript puro** (`src/lib/capyVera/eliza.ts`):
   - Normalização de texto (lowercase, remoção de acentos, pontuação).
   - Reflexão pronominal em português (eu↔você, meu↔seu, etc.).
   - Conjunto de regras com prioridade, regex e múltiplas respostas-template com `$1` para o trecho capturado.
   - Pilha de memória para retomar tópicos anteriores quando o usuário fica em silêncio (igual à ELIZA original).
   - Fallbacks não-diretivos rotativos.
   - **Intents** emitidos pela engine: `suggest_personal_task`, `suggest_offer_task`, `suggest_request_task`, `suggest_goal`, `open_journal`, `praise`, `none`. A UI usa esses intents para mostrar CTAs (ex.: "Adicionar como tarefa pessoal").
   - Regras temáticas TaskMates: autocuidado, ajuda mútua, ambiente, jornada do dia, habilidades, necessidades, comunidade. Exemplos:
     - "preciso de X" → sugere publicar X como **pedido**.
     - "gosto de / sei X" → sugere publicar X como **oferta**.
     - "fiz / terminei X" → sugere registrar X como **tarefa pessoal concluída**.
     - "estou cansado/triste" → respostas de acolhimento + sugestão de autocuidado.
     - "hoje eu fiz…" → modo journaling.
3. **Componente de chat** (`src/components/capy/CapyVeraChat.tsx`):
   - Drawer/Sheet à direita (mobile-friendly), avatar do mascote no topo, balões de mensagem, input fixo embaixo.
   - Mensagem de boas-vindas dinâmica (bom dia / boa tarde / boa noite).
   - Quando a engine retorna um intent acionável, exibe um botão CTA logo abaixo da resposta — ex.: "➕ Adicionar 'feijão preto' como pedido" que abre o `CreateTaskModal` pré-preenchido com o título e o tipo correto.
   - Esclarece na primeira interação: *"Sou uma capivara conversacional baseada em padrões (ELIZA, 1966) — sem IA generativa."* (transparência, como o artigo exige).
   - Histórico de sessão guardado em `localStorage` (`capyvera:history`), botão "Limpar conversa".
4. **FAB do mascote** (`src/components/capy/CapyVeraFAB.tsx`):
   - Botão flutuante redondo com a ilustração da capivara, acima do `BottomNav` (respeitando o `pb-20`).
   - Posicionado no canto oposto ao `ChatFAB` existente para não conflitar.
   - Visível apenas para usuários autenticados.
5. **Integração**:
   - Montar `<CapyVeraFAB />` no `AppLayout` (só quando há `user`).
   - Reaproveitar o `CreateTaskModal` existente para a ação de CTA, passando `defaultTitle`, `defaultTaskType` e tags inferidas (quando possível).

## Diagrama de fluxo

```text
input do usuário
   │
   ▼
normalize() ──► reflect() em capturas
   │
   ▼
itera RULES (ordenadas por prioridade)
   │
   ├── match? ──► escolhe template, preenche $1..$n, devolve {text, intent, payload}
   │
   └── nenhum match ──► fallback rotativo (ou retoma item da MEMORY stack)
                        │
                        ▼
                 UI renderiza resposta + CTA se intent ≠ none
```

## Arquivos a criar / alterar

- novo: `src/assets/capy-vera-mascot.png` (já gerado)
- novo: `src/lib/capyVera/eliza.ts` — engine + regras
- novo: `src/components/capy/CapyVeraChat.tsx` — UI do chat (Sheet)
- novo: `src/components/capy/CapyVeraFAB.tsx` — botão flutuante
- alterado: `src/components/layout/AppLayout.tsx` — monta o FAB para autenticados

## Notas técnicas

- Nenhuma dependência nova; tudo com React + shadcn (Sheet, Button, ScrollArea) já presentes.
- Sem backend e sem chamadas de rede — toda a lógica roda no cliente.
- Sem nenhuma chamada a Lovable AI, OpenAI, Gemini ou similar (exigência do usuário).
- Histórico em `localStorage` por usuário (`capyvera:history:<userId>`).
- Acessibilidade: `aria-label` no FAB, foco automático no input ao abrir, `role="log"` no painel de mensagens.

## Fora do escopo desta entrega

- Persistência das conversas em banco.
- Notificação noturna de journaling (pode entrar numa próxima iteração usando o sistema de push já existente).
- Extração automática de tags (a CTA pré-preenche apenas o título; o usuário escolhe tags no modal).
