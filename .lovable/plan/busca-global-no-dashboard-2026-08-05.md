# Busca global no Dashboard

Adicionar um campo de busca único no topo do Dashboard que encontra, ao mesmo tempo, comunidades, pessoas, cards (tarefas, produtos, opiniões) e tags.

## Como vai funcionar

- Barra de busca fixa no topo do Dashboard (acima das abas), com ícone de lupa e placeholder "Buscar comunidades, pessoas, cards e tags..." (PT/EN).
- Ao digitar (a partir de 2 caracteres, com debounce de ~250ms) abre um painel de resultados agrupado por categoria:
  - Comunidades (tags de categoria `communities`, com logo/emoji quando houver)
  - Pessoas (nome, @username, localização)
  - Tarefas / Produtos / Opiniões (título, com a etiqueta de tipo)
  - Tags (habilidades e recursos físicos)
- Cada grupo mostra até 5 itens, com "Ver todos" quando houver mais.
- Busca sem acento e sem diferenciar maiúsculas (reutiliza `removeAccents` de `src/lib/stringUtils.ts`) e reconhece traduções de tags (mesma lógica já usada no preenchimento inteligente de tags).
- Ações ao clicar:
  - Comunidade/Tag -> navega para `/tags/:id`
  - Pessoa -> navega para o perfil público
  - Card -> abre o modal de detalhes existente pelo host unificado
- Estados: carregando (skeleton), "nenhum resultado" com sugestão de refinar, Esc/clique fora fecha, navegação por teclado (setas + Enter).
- Respeita privacidade: comunidades ocultas e conteúdo de comunidades privadas não aparecem para quem não tem acesso; usuários bloqueados são omitidos.

## Detalhes técnicos

- Novo hook `src/hooks/useGlobalSearch.ts`: recebe a query com debounce e executa consultas em paralelo:
  - `profiles` (`full_name`, `username`, `location` via `ilike`), filtrando o próprio usuário e bloqueios (`useBlocks`).
  - `tags` + `tag_translations` (nome original e traduzido), separando `communities` das demais.
  - `tasks`, `products`, `polls` por título/descrição (`ilike`, limite 10 cada).
  - Filtragem de itens de comunidades privadas com `useHiddenCommunityTags` / `isVisibleItem` e `useHiddenCommunityAccess`.
- Novo componente `src/components/dashboard/GlobalSearch.tsx`: input claymórfico + painel de resultados (Popover/`Command` do shadcn já disponível), agrupado, com ícones por categoria seguindo o mapa de cores padrão do projeto (Skills verde, Comunidades azul, Recursos âmbar, Opinião lilás).
- Montagem em `src/pages/Dashboard.tsx`, logo abaixo do cabeçalho; abertura de cards reaproveita os estados `selectedTask/selectedProduct/selectedPoll` já ligados ao `ItemDetailModalHost` (sem duplicar modais).
- Strings novas adicionadas em `src/i18n/translations.ts` (pt/en).
- Mobile: painel em largura total, sem rolagem lateral, altura máxima com rolagem interna.
