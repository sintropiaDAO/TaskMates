Plano para corrigir a página de busca de membros em `https://taskmates.app/search`:

1. Ajustar `src/pages/UserSearch.tsx`
   - Remover `bg-gradient-hero` da tela de carregamento e do container principal da rota `/search`.
   - Trocar pelo mesmo fundo base do app/dashboard, usando os tokens existentes (`bg-background` ou `bg-transparent` herdando o `body`).
   - Manter o espaçamento, cards, busca e filtros como estão.

2. Padronizar estados da página
   - Garantir que tanto o estado carregando quanto a página renderizada usem o mesmo fundo.
   - Evitar gradientes quentes/bege/avermelhados nessa rota.

3. Validar visualmente
   - Capturar screenshot real de `/search`.
   - Comparar com `/dashboard?section=recommendations` para confirmar que o fundo da busca de membros está igual ao dashboard.