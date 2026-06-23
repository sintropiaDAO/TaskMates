
# Capyvera ilustrada e animada no app

## Visão geral
Criar um sistema reutilizável de ilustrações da Capyvera (estáticas e animadas) com **evolução expressiva** do personagem atual, usando **sprites PNG/WebP animados por CSS**. Tudo parte de uma única arte-mestra oficial que você vai enviar, garantindo consistência de proporção, cores e traço em todas as cenas.

## Pré-requisito (você)
Antes de implementar, preciso que você anexe na próxima mensagem:
- **1 imagem oficial da Capyvera** (frontal, fundo limpo) — será a "biblia visual" do personagem.
- Opcional: 1–2 poses extras se já tiver (ex.: comemorando, acenando).

Sem isso, qualquer ilustração nova vai divergir do personagem.

## Entregáveis

### 1. Character sheet oficial
- A partir da sua referência, gero um **sheet com 6 poses-base** mantendo proporções idênticas:
  - Idle / acenando (onboarding)
  - Comemorando braços pra cima (conclusão de tarefa)
  - Segurando troféu / estrela (badge, Lucky Star)
  - Pensativa (empty state genérico)
  - Cochilando (sem notificações / sem chat)
  - Plantando muda (empty state de tarefas, alinhado ao tom regenerativo)
- Salvos em `src/assets/capyvera/` como PNG transparente.

### 2. Sprite sheets animados (PNG/WebP)
Para cada animação, gero uma tira horizontal de 6–8 frames e animo via `steps()` no CSS.

| Animação | Frames | Uso |
|---|---|---|
| `celebrate` | 8 | Conclusão de tarefa |
| `cheer-trophy` | 8 | Nova badge / level up |
| `lucky-star` | 6 | Modal Lucky Star |
| `wave` | 6 | Onboarding / boas-vindas |
| `idle-blink` | 4 | Empty states (loop suave) |

### 3. Componente `<Capyvera />` reutilizável
`src/components/capy/Capyvera.tsx`:
```tsx
<Capyvera pose="celebrate" size="lg" loop={false} onEnd={...} />
```
- Props: `pose`, `size` (sm/md/lg/xl), `loop`, `onEnd`, `className`.
- Implementação: `<div>` com `background-image` apontando para o sprite e `animation: capy-{pose} 0.8s steps(N) ...`.
- Keyframes centralizados em `src/index.css` (tokens da marca, sem cores hardcoded em componentes).
- Respeita `prefers-reduced-motion`: cai para frame estático.

### 4. Integração nos pontos escolhidos

**a) Conclusão de tarefa** — em `TaskDetailModal` / fluxo de `register-task-completion`:
- Após sucesso, overlay full-screen leve com `<Capyvera pose="celebrate" />` + confete sutil (CSS), 1.5s, dismissível por toque.

**b) Conquistas e recompensas**:
- `BadgeBanner` (nova badge): troca o ícone genérico por `<Capyvera pose="cheer-trophy" />`.
- `LuckyStarModal`: substitui a estrela atual por `<Capyvera pose="lucky-star" />` ao revelar prêmio.

**c) Estados vazios** — atualizar:
- `MyTasksSection` vazio → `pose="plant"` + copy existente.
- `MyPollsSection` / `MyProductsSection` vazios → `pose="pensive"`.
- `ConversationList` vazia → `pose="sleep"`.
- Mantém layout atual, só troca o ícone/ilustração placeholder.

**d) Onboarding**:
- `QuizBanner` e primeira tela do `PotentialsQuiz`: `<Capyvera pose="wave" size="xl" />` no topo.
- `InstallBanner` ganha mini-Capyvera acenando.

## Detalhes técnicos
- **Performance**: cada sprite ≤ 80KB (WebP). Preload só do `celebrate` (mais frequente).
- **Acessibilidade**: `role="img"` + `aria-label` traduzido (PT/EN) via `LanguageContext`.
- **Reduced motion**: media query desativa animações, mostra frame final estático.
- **Tema**: ilustrações em PNG transparente funcionam em light e dark sem ajuste.
- **Consistência**: todas as poses geradas a partir da MESMA referência com prompt fixo (proporções, paleta, traço) — sem regerar do zero por cena.

## Fora de escopo desta entrega
- Lottie / vídeo MP4 (você optou por sprite + CSS).
- Novas ilustrações para chat, perfil público, landing — podem entrar numa segunda leva.
- Mudança no FAB atual da Capyvera (permanece como está).

## Próximo passo
Anexe a imagem oficial da Capyvera e eu sigo direto para a geração do character sheet + implementação.
