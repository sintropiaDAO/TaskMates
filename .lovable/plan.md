## Objetivo

1. Tornar a distinção oferta × solicitação imediata em todos os cards (Tarefas, Produtos, Enquetes) usando uma "aba de pasta" verde/rosa no topo, com o rótulo do tipo embutido na própria aba.
2. Permitir filtrar por tipo (oferta/solicitação) sem aumentar o número de botões — clique repetido no mesmo filtro cicla os estados.
3. Redesenhar os botões **Colaborar** e **Solicitar** dos cards para que não sejam confundidos com TagBadges (que agora têm claymorphismo).

---

## 1. "Aba de pasta" no topo dos cards

Substituir o atual `border-t-[3px]` por uma faixa colorida cheia (h-7) no topo do card, com cantos superiores arredondados acompanhando o card. Dentro da faixa, à esquerda, fica um rótulo tipo aba:

```text
┌──────────────────────────────────────┐
│ 🟢 Oferta · Tarefa                   │  ← faixa verde h-7, texto branco bold
├──────────────────────────────────────┤
│  Avatar  Nome do criador             │
│  Título da tarefa...                 │
```

- **Oferta** (task `offer`, product `offer`, poll futuro): faixa `bg-success` (#1a9d6c, verde regenerativo) + texto `text-success-foreground`.
- **Solicitação** (task `request`, product `request`): faixa `bg-pink-600` + texto branco.
- **Pessoal** (task `personal`): faixa `bg-blue-500` + texto branco (mantém atual).
- Conteúdo da aba: ícone (Sparkles para oferta / Hand para solicitação) + label `Oferta` / `Solicitação` + ponto separador + categoria (`Tarefa` / `Produto` / `Enquete`).
- O card perde o `border-t-[3px]` e o badge redundante "Oferta/Solicitação" que ficava na linha de badges (priority, completed, etc.). O badge de "Concluída/Entregue/Encerrada" continua na linha de badges.

Arquivos:
- `src/components/tasks/TaskCard.tsx`
- `src/components/products/ProductCard.tsx`
- `src/components/polls/PollCard.tsx` (faixa neutra `bg-info` "Enquete", sem oferta/solicitação)
- `src/components/dashboard/ActivityFeed.tsx` — replicar a mesma aba no card do feed e remover `getBorderTopColor` + badge redundante.

### Padronização Produtos verde/rosa
Substituir `amber-500` (offer) → `success` e `violet-500` (request) → `pink-600` em `ProductCard.tsx`, na grade do feed (`ActivityFeed.tsx` linhas 380-382, 408) e nos botões de ação do produto (linhas 230-236).

---

## 2. Filtro tri-estado (sem adicionar botões)

`ContentFilterDropdown` continua com as opções atuais (Tarefas / Produtos / Enquetes / Comunidades). Adicionar lógica de ciclo no clique do **mesmo** filtro já ativo:

```text
Tarefas (cinza, todos) → Tarefas (verde, só ofertas) → Tarefas (rosa, só solicitações) → Tarefas (cinza, todos) → ...
```

Mudanças:
- Estender o tipo de estado para `{ category: ContentFilterValue; typeMode: 'all' | 'offer' | 'request' }` em `src/pages/Dashboard.tsx` e em `ActivityFeed.tsx`.
- Clicar em uma opção diferente da atual ⇒ seleciona ela com `typeMode='all'`.
- Clicar na opção já ativa ⇒ cicla `all → offer → request → all`.
- Comunidades e Enquetes não participam do ciclo (cliques repetidos não alteram cor — não têm noção de oferta/solicitação).
- Trigger do dropdown reflete o estado:
  - `typeMode='offer'` → ícone e label em `text-success`, com um pequeno ponto verde após o label.
  - `typeMode='request'` → `text-pink-600` + ponto rosa.
  - `typeMode='all'` → estado atual (ícone `text-primary`).
- Tooltip no trigger explica o ciclo (PT: "Clique novamente para alternar entre todos → ofertas → solicitações").

Onde aplicar (conforme escolha do usuário):
- **Recomendações** (`Dashboard.tsx` `renderMixedGrid`): filtrar `taskList` por `task.task_type` e `productList` por `product.product_type` quando `typeMode !== 'all'`.
- **Próximos** (`Dashboard.tsx` `nearbyTasks` / `nearbyProducts`): mesma lógica antes de passar para `NearbyMap` e para a grade.
- **Feed de Atividade** (`ActivityFeed.tsx`): aplicar no `finalItems` antes de renderizar.
- Enquetes ficam ocultas quando `typeMode !== 'all'` (não têm offer/request).

---

## 3. Diferenciar botões **Colaborar** e **Solicitar**

Esses são os botões realmente confundidos com TagBadges (mesmo formato pill + sombra clay + cores temáticas). Hoje em `TaskCard.tsx` (linhas 428, 492, 530) e `ProductCard.tsx` (linhas 220-240) eles são `<Button variant="outline">` arredondados com fundo `bg-success/10` ou `bg-pink-600/10`.

Novo padrão visual para **ação primária do card** (Colaborar / Solicitar / Cancelar Solicitação / Você Solicitou):

- Forma: `rounded-lg` (não pill) com `h-9 px-3.5` — mais "botão", menos "badge".
- Fundo: cor sólida cheia (`bg-success` ou `bg-pink-600`) com texto branco — contraste total contra TagBadges translúcidas.
- Ícone à esquerda em círculo translúcido `bg-white/20 rounded-full p-1` — torna o ícone uma "etiqueta dentro do botão", diferente das tags planas.
- Sombra elevada: `shadow-md hover:shadow-lg hover:-translate-y-0.5` (mais profunda que clay-tag) + `active:translate-y-0 active:shadow-sm` (afundar no clique).
- Estado "já solicitado" / "já colaborando": borda dupla `ring-2 ring-success/40 ring-offset-2 ring-offset-card` + ícone de check em vez de mão/handshake, mantendo o fundo sólido mas com `opacity-90`.
- Contador (ex.: `1`) fica em pílula branca `bg-white text-success px-1.5 rounded-md text-[11px]` à direita do label — invertendo o esquema (fundo claro num botão escuro), reforçando hierarquia.
- Badges secundárias (Curtir / Não curtir / Aplaudir / Feedback) em `FeedCardActions.tsx` permanecem como estão (já são visualmente neutras e menores).

Arquivos:
- `src/components/tasks/TaskCard.tsx` (Colaborar/Você Colabora e Solicitar/Você Solicitou).
- `src/components/products/ProductCard.tsx` (botão Comprar/Fornecer).

---

## Detalhes técnicos

- Não criar componentes novos — editar os existentes.
- Reaproveitar tokens semânticos `--success` (já existe em `index.css` como verde regenerativo) e `--pink-600` do Tailwind (já em uso). Sem nova entrada em `index.css`.
- `ContentFilterDropdown` recebe nova prop `typeMode` e callback `onCycleType`; mantém `value`/`onChange` para compatibilidade.
- Em `ActivityFeed.tsx`, `getTypeBadges` deixa de emitir o badge de oferta/solicitação (movido para a aba).
- Acessibilidade: a aba inclui `aria-label` (`"Oferta: Tarefa"` / `"Solicitação: Produto"`); o trigger do filtro inclui `aria-pressed` refletindo o `typeMode`.
- Sem mudanças de backend/dados.

---

## Verificação

1. `tsgo` build limpo.
2. Conferir nas três seções (Recomendações, Próximos, Feed) que clicar três vezes em "Tarefas" cicla todas → ofertas (verde) → solicitações (rosa) → todas, com a grade filtrando de acordo.
3. Verificar via Playwright (viewport 390×844) que a aba aparece corretamente em TaskCard, ProductCard e ActivityFeed card, e que os botões Colaborar/Solicitar agora têm fundo sólido com sombra elevada, distinto das TagBadges adjacentes.