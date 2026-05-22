# Claymorphism v2 — Alinhar à Especificação

A v1 já trouxe radius grande, sombra dupla e inputs afundados. Falta o "DNA" clay descrito: sombra-base chunky tipo botão 3D, tipografia arredondada, cores mais saturadas, hover que afunda, ícones em bolha, e bottom-nav com pílulas.

## Ajustes

### 1. Tokens de sombra (index.css)
Substituir as sombras atuais por sombras "infláveis" com base sólida no eixo Y:

```text
--clay-shadow:
  0 8px 0 -2px hsl(155 65% 28%),                /* base sólida (cor do elemento) */
  0 14px 24px -4px hsl(155 40% 25% / 0.35),     /* sombra de chão difusa */
  inset 0 2px 6px hsl(0 0% 100% / 0.65),         /* brilho topo */
  inset 0 -3px 6px hsl(155 50% 25% / 0.15);      /* sombra interna inferior */
```

Variáveis derivadas por "família" de cor (primary/secondary/accent/destructive/card), para que a base sólida combine com a superfície — ex.: `--clay-base-primary`, `--clay-base-card`. Cria-se também `--clay-shadow-card`, `--clay-shadow-primary`, etc.

`--clay-shadow-pressed` = sombra reduzida + `translateY(4px)`, aplicada no hover (afunda).
`--clay-shadow-inset` = mantém para inputs (cavidade).
Versão dark: base mais escura, brilho mais sutil.

### 2. Radius
- `--radius: 1.75rem` (28px) — cards "gordos".
- Pílulas (`rounded-full`) para botões e badges.
- Inputs `rounded-2xl` (16px).

### 3. Tipografia
- Importar **Fredoka** (headings, peso 500–700) e **Nunito** (body, 400–800) em `index.css`.
- Atualizar `tailwind.config.ts`: `font-sans: Nunito`, `font-display: Fredoka`.
- Substituir família atual (Outfit/Space Grotesk).

### 4. Paleta — pastéis vibrantes
- Background: `42 35% 96%` (off-white quente / bege claro) em vez de verde dessaturado.
- Card: branco puro `0 0% 100%`.
- Secondary (azul): aumentar saturação para `200 85% 78%`.
- Accent (teal): `175 70% 75%`.
- Adicionar variantes "playful": `--joy-pink: 340 85% 78%`, `--joy-amber: 38 95% 70%`, `--joy-violet: 270 75% 80%` para uso opcional em cards temáticos.
- Dark mode: fundo `200 30% 12%` (azul profundo) com elementos vibrantes.

### 5. Botões (button.tsx)
- `rounded-full`, padding generoso (`px-6 h-11`).
- `default` usa `--clay-shadow-primary` (base verde escura), `secondary` usa azul, etc.
- Hover: `translate-y-1` + sombra-base reduzida.
- Active: `scale-95` + `clay-pressed`.
- Transição `transition-all duration-150 ease-out`.

### 6. Card (card.tsx)
- `.clay-card` aplica `--clay-shadow-card` + radius 28px + `bg-card`.
- Hover (quando interativo): mantém posição (cards normais não devem "pular" a cada hover).

### 7. Inputs/Textarea
- `rounded-2xl`, padding maior (`px-5 h-12`), `clay-inset` mantém cavidade mas com `bg-background` quente.

### 8. Badges
- `rounded-full`, `px-4 py-1`, sombra clay-sm colorida pela variante.

### 9. BottomNav
- Ícones envolvidos em "bolha" pílula: container `rounded-full` que pinta de `bg-primary/15` quando ativo e usa `clay-shadow-sm`.
- Botão central "+" ganha sombra chunky verde + animação de pressão.

### 10. Ícone-bolha utilitário
- Nova classe `.icon-bubble` em index.css:
  `inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary shadow-[var(--clay-shadow-sm)]`.
- Aplicar gradualmente onde tags/feature-pills exibem ícones (Hero, FeatureSection).

## Não muda
- Lógica de negócio, rotas, dados, hooks.
- Estrutura dos componentes (só classes/tokens).
- Logos, imagens.

## Detalhes técnicos

Resumo do utilitário `.clay` revisado:

```text
.clay {
  border-radius: var(--radius);
  background: hsl(var(--card));
  box-shadow: var(--clay-shadow-card);
  transition: transform .15s ease, box-shadow .15s ease;
}
.clay:hover { /* opcional, só em interativos via clay-interactive */ }
.clay-interactive:hover { transform: translateY(3px); box-shadow: var(--clay-shadow-pressed); }
.clay-interactive:active  { transform: translateY(4px) scale(.97); }
```

## Validação
Revisar Landing (Hero + Features + CTA), Dashboard com BottomNav, AuthForm, TaskDetailModal e Admin em light + dark, viewport mobile + desktop.
