# Plano: Nova logo TaskMates

## Direção criativa

Símbolo geométrico moderno representando colaboração e conexão entre pessoas, com gradiente do verde regenerativo (#1a9d6c) ao azul secundário do app. Estilo escalável, à la Slack/Airbnb — limpo, memorável, funciona bem em 16px e 512px.

**Conceito visual:** três (ou quatro) figuras humanas estilizadas — círculos como cabeças + arcos como braços/elos — entrelaçadas formando um círculo aberto. Lê simultaneamente como "pessoas dadas as mãos", "rede de nós conectados" e sutilmente como uma folha/semente regenerativa pela forma geral. Sem nenhum texto dentro do símbolo, para máxima escalabilidade.

## Entregáveis

1. **Símbolo isolado** (`src/assets/logo-taskmates-mark.png`, 1024×1024, fundo transparente) — para favicon, PWA, avatar, contextos quadrados.
2. **Lockup horizontal** (`src/assets/logo-taskmates-lockup.png`, 1536×512, fundo transparente) — símbolo + wordmark "TaskMates" ao lado, para headers e materiais de divulgação.

Ambos gerados via imagegen em qualidade premium para garantir nitidez tipográfica e geometria precisa.

## Integração no app

Substituir todas as referências à logo atual pela nova versão:

- `src/components/layout/AppHeader.tsx` → lockup
- `src/components/dashboard/DashboardHeader.tsx` → lockup
- `src/components/landing/Hero.tsx` → lockup (versão grande)
- `src/components/pwa/InstallBanner.tsx` → símbolo
- `src/pages/Install.tsx` → lockup
- `src/components/auth/AuthForm.tsx` → símbolo (substitui `app-icon.png`)
- `public/favicon.png` → símbolo redimensionado (256×256)
- `index.html` → mantém a referência `/favicon.png`

A logo antiga (`logo-taskmates.png`, `app-icon.png`) permanece no projeto até a aprovação visual, depois pode ser removida em um passo subsequente.

## Garantia de qualidade

Após geração, abro ambas as imagens para inspecionar:
- Geometria simétrica e bem alinhada
- Gradiente verde→azul fluindo de forma natural
- Wordmark legível e bem espaçado em relação ao símbolo
- Fundo realmente transparente (sem halo branco)

Se algo não estiver no nível esperado, regenero antes de integrar.

## Detalhes técnicos

- Imports são ES6 diretos (PNG via `@/assets/...`), nenhum lovable-asset.
- O `manifest.webmanifest` do PWA usa `favicon.png` — atualização automática ao substituir o arquivo.
- Nenhuma mudança de schema ou backend.
