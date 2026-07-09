
## Objetivo

Padronizar os 6 modais (Criar/Detalhar/Editar de Tarefas, Produtos, Enquetes) com o mesmo visual claymórfico do dashboard, cores derivadas da logo (verde regenerativo + rosa + azul), campos com layout unificado, e um novo mecanismo "Inserir" que revela campos opcionais on-demand.

**Escopo é estético/layout apenas.** Toda a lógica atual (submits, calendários, upload, SmartTagSelector, criação de tags, validações, RPCs) é preservada — só reorganizamos a UI.

---

## 1. Novos componentes compartilhados (`src/components/ui/form/`)

Criar primitivos reutilizáveis para consistência entre os 6 modais:

- **`ClayCard`** — wrapper claymórfico (usa `clay-tag` / novo `clay-panel` no `index.css`): fundo `bg-card`, borda sutil, sombra dupla (externa suave + inner highlight no topo), radius `rounded-2xl`.
- **`FormField`** — bloco de campo com header (label + ícone + hint opcional), corpo, e slot de rodapé colapsável (para o "Ver exemplos" de tags). Cada campo fica dentro de um `ClayCard` próprio, com `space-y-4` entre campos para separação clara.
- **`FormSectionTitle`** — título do modal padronizado (com ícone circular colorido, título + subtítulo).
- **`ModalShell`** — `DialogContent` padronizado: `max-w-lg`, `max-h-[90vh]`, scroll interno, header sticky, footer sticky com botões primário/secundário no estilo dos botões Colaborar/Solicitar (sólido colorido quando ativo, neutro quando desabilitado).
- **`InsertFieldMenu`** — botão "+ Inserir campo" que expande uma lista de checkboxes com os opcionais disponíveis. Ao ticar, o campo respectivo aparece no formulário na ordem definida. Ao desticar, o campo é removido (e o estado limpo).
- **`UnifiedTagField`** — um único campo "Tags" com:
  - Texto explicativo curto: "Adicione tags de habilidades, comunidades e recursos — cada cor identifica a categoria."
  - Três `SmartTagSelector` empilhados (skills → communities → resources) sem headers verbosos, apenas com badge de categoria colorida.
  - **Link colapsável** "Ver exemplos" dentro do mesmo `ClayCard` que revela até 5 sugestões por categoria, ordenadas pelas tags mais usadas pelo próprio usuário (via `useTagUsage` + `user_tags` do usuário atual).
  - Mantém o botão de sugestão inteligente existente.

## 2. Tokens visuais (`src/index.css`)

Adicionar/estender:
- `.clay-panel` — variação do `clay-tag` para painéis maiores (sombra externa mais suave, inner highlight branco de 1px no topo).
- `.clay-input` — aplicado a `Input`/`Textarea`/`Select` triggers: fundo levemente rebaixado (inset shadow suave), foco com anel verde (`ring-primary/40`).
- Confirmar paleta: primary = verde da logo `#1a9d6c`, accent secundário azul, destaques rosa (solicitação) — já existentes, apenas reforçar uso semântico.

## 3. Modal de Criação — layout unificado

Ordem fixa e mínima (sempre visíveis, nessa ordem):

1. **Título** (obrigatório)
2. **Imagem**
3. **Descrição** (RichTextEditor)
4. **Tags** (`UnifiedTagField`)
5. **+ Inserir campo** (`InsertFieldMenu`) — abre lista de opcionais tickáveis. Campos ticados aparecem abaixo de Tags, na ordem da lista.

### Lista "Inserir" por modal

Ordem = ordem em que hoje aparecem no formulário atual (excluindo Título/Imagem/Descrição/Tags):

- **Tarefa**: Tipo (Oferta/Solicitação/Pessoal) · Localização · Data e horários · Prioridade · Configurações avançadas (auto-aprovar, streak, etc.).
- **Produto**: Tipo (Oferta/Solicitação) · Quantidade · Prioridade · Localização · Data limite e horários · Link de referência.
- **Enquete**: Opções de voto* · Data limite e horários · Permitir novas opções · Quórum mínimo.

*Nota: enquete precisa de ≥2 opções para funcionar. Vou tratar "Opções de voto" como **default visível** (é o núcleo de uma enquete), não como opcional — restante fica no Inserir. Confirme se prefere que fique no Inserir mesmo assim.

Cada campo, ao ser ticado no Inserir, monta como um `FormField` dentro de `ClayCard`, seguindo o mesmo layout dos defaults.

## 4. Modais de Detalhes/Edição

- Aplicar `ModalShell`, `FormSectionTitle`, `ClayCard` nos blocos (info principal, colaboradores, comentários, ratings, feedbacks, related actions).
- Botões (Editar, Concluir, Colaborar, Solicitar, Deletar, Compartilhar, Reportar) padronizados com o estilo neutro/vivo já usado no dashboard.
- Modo edição usa exatamente os mesmos `FormField` + `UnifiedTagField` + `InsertFieldMenu` do modal de criação (com os campos opcionais já ticados quando o item os possui).
- **Nenhuma mudança em queries, mutations, upload, calendário, SmartTagSelector, ou lógica de submit.**

## 5. Botões e títulos globais dos modais

- **Título do modal**: ícone circular colorido (verde=criar, azul=editar, roxo=detalhes) + texto principal + subtítulo curto.
- **Botões primários**: sólidos com a cor semântica (verde para confirmar/criar/salvar; rosa para ações de solicitação; vermelho para destrutivo com AlertDialog dentro do DialogContent conforme regra existente).
- **Botões secundários**: neutros (cinza claymórfico), viram vivos só ao ativar.
- Espaçamento e tipografia idênticos aos cards do dashboard.

## 6. Arquivos afetados

**Novos**
- `src/components/ui/form/ClayCard.tsx`
- `src/components/ui/form/FormField.tsx`
- `src/components/ui/form/FormSectionTitle.tsx`
- `src/components/ui/form/ModalShell.tsx`
- `src/components/ui/form/InsertFieldMenu.tsx`
- `src/components/ui/form/UnifiedTagField.tsx`

**Editados (apenas layout/estética)**
- `src/index.css` — tokens `.clay-panel`, `.clay-input`.
- `src/components/tasks/CreateTaskModal.tsx`
- `src/components/tasks/TaskDetailModal.tsx`
- `src/components/products/CreateProductModal.tsx`
- `src/components/products/ProductDetailModal.tsx`
- `src/components/polls/CreatePollModal.tsx`
- `src/components/polls/PollDetailModal.tsx`

**Preservado (não tocar na lógica)**
- Hooks `useTasks`, `useProducts`, `usePolls`, `useTags`, `useTagUsage`.
- `SmartTagSelector`, `RichTextEditor`, `LocationAutocomplete`, `Calendar`.
- Todos os handlers de submit, upload de imagem, criação de tag, calendário.

## 7. Validação

- Typecheck após cada bloco de arquivos.
- Verificar visualmente: abrir cada modal, alternar campos via Inserir, editar item existente, criar novo, checar mobile (sem overflow horizontal).
- Confirmar contraste em dark mode.

---

## Pergunta antes de implementar

**Enquetes**: as opções de voto (mínimo 2) fazem parte do núcleo da enquete. Devo mantê-las como campo default visível junto com Título/Imagem/Descrição/Tags, ou mesmo assim colocá-las dentro do "Inserir" e o usuário precisa abrir para configurar?
