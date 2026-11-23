# Lives e Rodas de Conversa no TaskMates

Duas fases complementares, ambas sem custo inicial e reaproveitando as tarefas do tipo **Reunião** e **Evento** que já existem (com data, link, tags, participantes e privacidade).

## Fase A — Lives Incorporadas (YouTube, Twitch, Vimeo, Instagram como link)

**O que a pessoa vê**
- No formulário de Evento/Reunião, novo campo opcional "Transmissão ao vivo" para colar o link da live.
- O app reconhece a plataforma e mostra o selo correspondente (YouTube, Twitch, Vimeo; outros links abrem fora do app).
- Status automático da live: **Agendada** (antes do horário), **Ao vivo agora** (selo vermelho pulsante entre início e fim), **Gravação disponível** (depois, se houver replay).
- Card no Feed com selo "Ao vivo" e destaque no topo do Feed enquanto a live acontece, respeitando as mesmas regras de privacidade e tags seguidas dos outros cards.
- Na página do item: player incorporado, botão "Adicionar à agenda" (já existe), comentários do item como chat da live e lista de participantes.
- Notificação (inclusive push) para participantes e seguidores da tag: 15 minutos antes e quando começar.

**Gamificação**
- "Assistir/participar" marca a pessoa como participante → conta para EXP, Jornadas (ação "participar") e selos existentes, sem regras novas de pontuação.
- Selo visual "Anfitrião(ã) de Lives" pode vir depois, se desejado.

## Fase B — Rodas de Conversa Interativas (Jitsi Meet)

**Escolha recomendada:** Jitsi Meet (gratuito, sem conta, sem chave). Daily.co e 100ms ficam como evolução futura caso seja preciso mais controle (gravação, moderação avançada), pois exigem conta e têm custo acima da cota grátis.

**O que a pessoa vê**
- Em Reunião/Evento, opção "Criar roda de conversa no TaskMates": o app gera uma sala única e difícil de adivinhar.
- Botão **Entrar na roda** aparece só para quem pode ver o item e somente perto do horário (15 min antes até o fim).
- Sala abre dentro do app em tela cheia (câmera, microfone, compartilhar tela, chat), com nome e foto do perfil já preenchidos; no celular, opção de abrir no app Jitsi.
- Ao entrar, a pessoa vira participante do item (conta para EXP/Jornadas).
- Ao encerrar, o anfitrião pode concluir a tarefa normalmente, com a celebração da Capyvera já existente, e registrar ata no modelo de notas de reunião.

**Limites honestos**
- O servidor público do Jitsi pode pedir login de moderador ao primeiro participante e limita tempo de salas incorporadas; se isso atrapalhar, migramos para Daily.co (cota grátis mensal) mantendo a mesma interface.
- Sem gravação nesta fase.

## Ordem de entrega
1. Campo de live + detecção de plataforma + player na página do item.
2. Status Agendada/Ao vivo/Gravação + selo e destaque no Feed.
3. Notificações antes/ao começar.
4. Rodas de conversa Jitsi com botão Entrar e participação automática.
5. Testes de ponta a ponta com duas contas.

## Detalhes técnicos
- Migration em `tasks`: `live_url text`, `live_provider text` (youtube|twitch|vimeo|other), `live_status` calculado a partir de `start_date`/`end_date` (sem coluna), `room_provider text` (jitsi) e `room_name text` gerado com UUID aleatório. Gravado no mesmo insert/update dos campos base (regra do AGENTS.md).
- `src/lib/liveEmbed.ts`: parser puro de URL → embed (`youtube-nocookie.com/embed`, `player.twitch.tv?parent=taskmates.app,...`, `player.vimeo.com`), com testes unitários; apenas domínios permitidos viram iframe com `sandbox`/`allow` restritos.
- Componentes: `LiveBadge`, `LivePlayer` (carregado após hidratação), `RoundtableRoom` usando a Jitsi IFrame API carregada dinamicamente em `<ClientOnly>`.
- O `room_name` só é retornado por leitura protegida pelas políticas de visibilidade já existentes (`can_view_entity`); não aparece em portfólios públicos nem previews.
- Notificações: cron server route em `src/routes/api/public/` verificando segredo, chamando `createNotification` + `sendPushToUser` existentes, idempotente por evento.
- Destaque "Ao vivo" no Feed reutiliza a consulta atual do dashboard, apenas ordenando itens ao vivo primeiro.
