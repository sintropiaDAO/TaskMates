# Background — Off-white quente

Trocar o token `--background` no light mode de `150 40% 96%` (verde dessaturado) para `42 35% 96%` (bege claro / off-white quente).

## Mudança

- `src/index.css` (light `:root`): `--background: 42 35% 96%;`
- Manter dark mode, demais tokens e gradientes inalterados.

## Validação

Conferir Landing e Dashboard: fundo deve aparecer levemente bege/quente, sem perder contraste com cards (`--card: 150 35% 99%`).
