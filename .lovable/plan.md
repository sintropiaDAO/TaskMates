# Claymorphism v2 — Alinhar à Especificação (Paleta Verde/Azul)

A v1 já trouxe radius grande, sombra dupla e inputs afundados. Falta o "DNA" clay: sombra-base chunky tipo botão 3D, tipografia arredondada, hover que afunda, ícones em bolha, e bottom-nav com pílulas. **Mantém a paleta verde/azul atual** para combinar com a logo.

## Ajustes

### 1. Sombras chunky 3D (`src/index.css`)
Substituir as sombras atuais por sombras "infláveis" com base sólida no eixo Y:

```text
--clay-shadow-card:
  0 8px 0 -2px hsl(155 40% 80%),               /* base verde-pálido */
  0 14px 24px -6px hsl(155 50% 25% / 0.25),    /* chão difuso */
  inset 0 2px 6px hsl(0 0% 100% / 0.7);        /* brilho topo */

--clay-shadow-primary:
  0 8px 0 -2px hsl(155 65% 25%),               /* base verde escuro */
  0 14px 22px -6px hsl(155 65% 20% / 0.4),
  inset 0 2px 4px hsl(0 0% 100% / 0.35);

--clay-shadow-secondary: /* azul */ ...
--clay-shadow-destructive: /* vermelho */ ...
--clay-shadow-pressed: sombra-base reduzida a 2px + translateY(4px)
--clay-shadow-inset: cavidade (mantém para inputs)
```

Dark mode: base mais escura, brilho sutil.

### 2. Radius
- `--radius: 1.75rem` (28px) — cards "gordos".
- `rounded-full` para botões/badges.
- Inputs `rounded-2xl` (16px).

### 3. Tipografia
- Importar **Fredoka** (headings, 500–700) e **Nunito** (body, 400–800).
- `tailwind.config.ts`: `font-sans: Nunito`, `font-display: Fredoka`.
- Remove Outfit/Space Grotesk.

### 4. Paleta — mais saturada (mesmas matizes)
- Background: `150 35% 96%` (off-white levemente esverdeado, quente).
- Card: branco quase puro `150 30% 99%`.
- Primary: mantém `155 65% 40%` (verde regenerativo).
- Secondary: `200 75% 85%` (azul pastel saturado, era 70% 92%).
- Accent: `175 65% 82%` (teal pastel saturado).
- Mantém destructive/warning/info/success.
- Dark: fundo `160 35% 8%` com elementos vibrantes.

### 5. Componentes

- **`button.tsx`**: `rounded-full`, `px-6 h-11`, sombra chunky por variante (`--clay-shadow-primary` etc), `hover:translate-y-1` + sombra reduzida, `active:translate-y-1.5 active:scale-[0.97]`, `transition-all duration-150 ease-out`.
- **`card.tsx`**: `clay-card` aplica `--clay-shadow-card` + radius 28px + `bg-card`. Sem hover por padrão (cards parados).
- **`input.tsx` / `textarea.tsx`**: `rounded-2xl`, `px-5 h-12`, `clay-inset` (cavidade) com `bg-background` (off-white).
- **`badge.tsx`**: `rounded-full`, `px-4 py-1`, sombra chunky reduzida (`--clay-shadow-sm-primary`).
- **`BottomNav.tsx`**: cada ícone vira uma "pílula" — quando ativo recebe `bg-primary/15` + radius full + `clay-shadow-sm`. Botão central "+" ganha sombra chunky verde com animação de pressão.

### 6. Utilitário `.icon-bubble` (em `index.css`)
```text
.icon-bubble {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.5rem; height: 2.5rem; border-radius: 9999px;
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  box-shadow: var(--clay-shadow-sm-card);
}
```
Aplicar em Hero/Features onde já existem ícones com fundo (não varrer o app todo).

## Não muda
- Lógica de negócio, rotas, dados, hooks.
- Estrutura de componentes (só classes/tokens).
- Logos, imagens, paleta de marca (verde/azul preservados).

## Validação
Revisar Landing (Hero + Features + CTA), Dashboard com BottomNav, AuthForm, TaskDetailModal em light + dark, viewport mobile + desktop.
