# Corrigir divergência dos modais de criação de tarefa

## O que está acontecendo

O campo "Marcar como concluída" só aparece quando quem abre o modal passa a função de conclusão (`onComplete`). O Dashboard passa; a página de Tag e o modal de detalhes da Tag não passam. Por isso o mesmo modal se comporta de forma diferente dependendo de onde é aberto.

Verificado no código:
- `src/pages/Dashboard.tsx` monta o modal com `onComplete`, `preSelectedTags` e `parentTaskId`.
- `src/pages/TagDetail.tsx` e `src/components/tags/TagDetailModal.tsx` montam o modal sem `onComplete` (e sem `preSelectedTags`).
- `src/components/tasks/CreateTaskModal.tsx` só renderiza o bloco de conclusão quando `onComplete` existe.

## Correção

1. Tornar a conclusão um comportamento interno do próprio modal: ele passa a usar a função de conclusão de tarefas do app por padrão, em vez de depender de quem o abre. A prop externa continua aceita apenas como sobrescrita opcional.
2. Resultado: o campo "Marcar como concluída" aparece igual em qualquer lugar — Menu, página da Tag e Ações Relacionadas.
3. Além disso, alinhar as duas telas de Tag ao Dashboard passando as tags pré-selecionadas da comunidade atual, para que a tarefa criada ali já venha com a tag certa.

## Como impedir que volte a acontecer

Adotar o mesmo padrão já usado nos modais de detalhe (host único + teste de arquitetura):

- Criar um host compartilhado `src/components/common/CreateItemModalHost.tsx` que monta `CreateTaskModal` (e futuramente os de Produto/Opinião) já com toda a fiação padrão: criação, edição, conclusão, subtarefa e tags pré-selecionadas. Cada tela só informa contexto (tag atual, item em edição) e callbacks de refresh.
- Migrar Dashboard, `TagDetail` e `TagDetailModal` para esse host.
- Adicionar um teste de arquitetura, nos moldes de `tests/architecture/no-duplicate-detail-modals.test.ts`, que falha se `CreateTaskModal` / `CreateProductModal` / `CreatePollModal` forem importados fora do host (com allowlist explícita).
- Adicionar um teste de comportamento garantindo que o modal renderiza "Marcar como concluída" na criação, sem depender de props do chamador.

## Detalhes técnicos

- `CreateTaskModal`: `onComplete` passa a ter fallback interno via `useTasks().completeTask`; a condição de render vira `!editTask` (sempre disponível na criação).
- Tipo de retorno de `completeTask` inclui `wonStar`; a assinatura da prop será relaxada para aceitar ambos.
- Novo host reaproveita a lógica de submit hoje duplicada em Dashboard/TagDetail/TagDetailModal (insert em `tasks` + `task_tags` + refresh).
- Novos testes em `tests/architecture/` e `src/components/tasks/CreateTaskModal.test.tsx`.
