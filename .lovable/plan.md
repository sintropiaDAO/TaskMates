# Claymorphism Redesign

Adaptar o TaskMates ao estilo **claymorphism**: superfícies suaves, "infladas", com cantos bem arredondados, sombras duplas (externa escura + interna clara) e cores pastéis vibrantes sobre o tema verde/azul regenerativo já existente.

## Princípios visuais

- **Soft 3D**: cada card/botão parece esculpido em argila — borda arredondada generosa, leve gradiente claro no topo, sombra dupla (uma escura embaixo, uma luz no topo).
- **Cores pastéis saturadas**: manter a paleta verde regenerativo + azul oceano, mas em versão mais "pastel pop" para fundos de superfícies.
- **Sem bordas duras**: substituir `border` 1px por sombras suaves; usar `border` só em inputs.
- **Hierarquia por profundidade**, não por linhas: cards elevados, inputs "afundados" (inset shadow).
- **Acessibilidade preservada**: contraste de texto e estados de foco mantidos.

## Escopo

Aplicar globalmente via design tokens + utilitários, sem reescrever componentes. Componentes shadcn herdam automaticamente.

### Tokens (`src/index.css`)
- Aumentar `--radius` de `0.75rem` para `1.25rem` (cantos mais "clay").
- Adicionar variáveis novas:
  - `--clay-shadow`: sombra dupla externa + highlight interno topo
  - `--clay-shadow-sm`: versão compacta para botões/badges
  - `--clay-shadow-inset`: para inputs e estados "pressionados"
  - `--clay-highlight`: gradiente sutil topo→base aplicado em superfícies
- Ajustar `--background` para um pastel ligeiramente mais saturado (mesma matiz, +luminosidade quente).
- Versão dark: sombras com tons azul-esverdeados profundos + highlight sutil.

### Utilitários novos (`@layer components` em `index.css`)
- `.clay` — superfície clay padrão (gradient + shadow + radius)
- `.clay-sm` — variante menor
- `.clay-inset` — entradas afundadas
- `.clay-pressed` — estado active/clique
- Atualizar `.glass`, `.shadow-soft`, `.shadow-glow`, `.card-hover` para o vocabulário clay.

### Componentes base ajustados (mínimo, via classes)
- `src/components/ui/card.tsx` — Card recebe shadow clay e radius maior por padrão (substituir `shadow-sm border` por `clay`).
- `src/components/ui/button.tsx` — variantes `default`, `secondary`, `outline` ganham shadow clay-sm + active:clay-pressed; manter `ghost`/`link` planos.
- `src/components/ui/input.tsx` e `textarea` — `clay-inset` ao invés de `border`.
- `src/components/ui/badge.tsx` — radius full + clay-sm leve.
- `src/components/ui/dialog.tsx` / `sheet.tsx` / `popover.tsx` — radius e shadow clay.
- `src/components/dashboard/BottomNav.tsx` — barra com shadow clay flutuante.
- `src/components/landing/Hero.tsx` e `FeaturesSection.tsx` — cards de feature em clay.

### Não muda
- Lógica de negócio, dados, rotas, contextos, hooks.
- Tokens semânticos (primary, secondary, etc.) continuam apontando aos mesmos hues.
- Imagens, logos, ícones.

## Detalhes técnicos

Exemplo do token principal:

```text
--clay-shadow:
  20px 20px 40px hsl(155 30% 75% / 0.45),
  -10px -10px 30px hsl(0 0% 100% / 0.9),
  inset 1px 1px 2px hsl(0 0% 100% / 0.6);
```

`.clay` aplica: `border-radius: var(--radius); background: linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%); box-shadow: var(--clay-shadow);`

Dark mode usa `hsl(160 30% 4% / 0.6)` para sombra escura e `hsl(155 40% 20% / 0.4)` para highlight.

## Validação

Após aplicar: revisar visualmente Landing, Dashboard, TaskDetail, Auth e BottomNav em viewport mobile e desktop, light e dark.
