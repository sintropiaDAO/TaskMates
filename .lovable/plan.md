## Melhorar a animação de celebração da Capyvera

### Contexto
A celebração atual (`TaskCelebrationOverlay.tsx`) mostra a Capyvera em pose `celebrate` com uma animação simples de entrada (`capy-pop`) e confetes caindo. O usuário quer:
- A própria imagem da Capyvera realizando movimentos (motion design realista).
- A imagem não ficar "solta" na tela — adicionar um fundo/container por trás dela.
- Manter os confetes.
- Deixar a animação mais longa (≈2,5–3s).

### Implementação

1. **Trocar a animação da Capyvera por sequência de motion design realista**
   - Usar `framer-motion` (já está no projeto) para animar a própria imagem da Capyvera.
   - Criar uma sequência com keyframes:
     - Entrada com scale pequeno → overshoot → escala normal.
     - Salto com `translateY`, `rotate` e `scaleY`/`scaleX` para efeito squash-and-stretch (compressão ao subir, esticamento ao descer).
     - Pequena oscilação lateral para dar sensação de alegria.
     - Idle final suave enquanto o overlay permanece visível.
   - Duração total: ~2.800 ms.

2. **Adicionar um fundo/container atrás da Capyvera**
   - Criar um círculo ou placa arredondada com a paleta regenerativa (tom primário/verde) usando claymorphism.
   - O container terá animação de expansão suave (`scale`) e halo pulsante por trás, para a Capyvera não parecer "flutuando sem contexto".

3. **Manter e aprimorar os confetes**
   - Manter a geração de confetes coloridos.
   - Melhorar a física: variação de tamanho, rotação, velocidade de queda e dispersão horizontal.
   - Garantir que o confete respeite `prefers-reduced-motion`.

4. **Ajustar o overlay e acessibilidade**
   - Aumentar a duração do overlay para acompanhar a animação longa.
   - Preservar o `role="status"`, `aria-live="polite"` e o fechamento ao tocar/clicar.
   - Adicionar media query `prefers-reduced-motion` que reduza a animação à simples fade-in sem salto e confete estático.

5. **Adicionar estilos CSS auxiliares em `src/index.css`**
   - Novos keyframes para o halo e squash-and-stretch da Capyvera (fallback/alternativa ao Framer Motion).
   - Estilos para o container de fundo (círculo com gradiente e sombra).

### Arquivos alterados
- `src/components/capy/TaskCelebrationOverlay.tsx` (principal)
- `src/index.css` (keyframes e estilos do container/halo)

### Validação
- Verificar o build (`vite build` ou `bun run build`).
- Testar a animação acionando o evento `TASK_COMPLETED_EVENT` no console do preview ou concluindo uma tarefa.
- Validar que não há scroll lateral ou quebra de layout no mobile.
- Confirmar que a animação respeita `prefers-reduced-motion` do sistema.