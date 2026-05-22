# Plano de evolução do TaskMates — alinhamento com a pesquisa de Tecnologias Persuasivas

Análise do artigo "The prototype: applying persuasive technologies to influence regenerative behavior" (SintropiaDAO, Flávia Macêdo) cruzada com o estado atual do app. O plano abaixo lista **apenas o que ainda não foi implementado**, organizado por prioridade. Nada existente é removido.

## Resumo do que o app já cobre

Sistema de tags acionáveis, motor de recomendação personalizado, tarefas (oferta/pedido/pessoal), subtarefas, acordo "Nutrir a Vida" no cadastro, polls, produtos/inventário, grupos por tag/comunidade, reputação com avaliações mútuas, vouching, verificação, chat com grupos automáticos, denúncias e bloqueios, prova de conclusão em blockchain (Scroll), badges/Lucky Stars, geolocalização, feed de atividade e galeria de concluídos.

## Lacunas identificadas no artigo

Agrupei as funcionalidades propostas que ainda **não existem** no TaskMates em 4 frentes.

### Frente 1 — Capy Vera (agente conversacional persuasivo)
O artigo coloca o mascote Capy Vera como gatilho central do modelo B=MAT. Hoje o app não tem nenhum agente IA conversacional.

- Mascote Capy Vera com identidade visual (capivara) e personalidade definida.
- Chat com a Capy Vera usando Lovable AI Gateway (Gemini 2.5 Flash por custo/latência).
- Prompt noturno de journaling ("como foi seu dia?") via notificação.
- Extração automática de tarefas a partir do texto livre (NLP) com sugestão de 1-clique para adicionar como tarefa pessoal/oferta/pedido com tags pré-preenchidas.
- Sugestão proativa: quando detecta match entre meta privada de um usuário e oferta pública de outro, manda mensagem persuasiva ("Mary começou um grupo de corrida perto de você…").
- Elogios contextuais (princípio do praise) ao concluir tarefas, atingir metas ou ajudar alguém.

### Frente 2 — Dimensão "Self" expandida (auto-monitoramento e metas)
Hoje há tarefas pessoais e calendário, mas não há um módulo dedicado a metas com progresso, nem o gráfico de equilíbrio anti-free-rider.

- Tabela de **metas pessoais** (goal-setting): título, descrição, prazo, tarefas vinculadas, progresso calculado.
- Dashboard "Self": metas ativas, streak de auto-cuidado, tempo dedicado por tag.
- **Gráfico de equilíbrio Oferta / Pedido / Pessoal** no perfil público (combate ao free-rider, citado explicitamente).
- Integração opcional de dados externos via webhook/import manual (passos, exercícios, leitura) para alimentar tarefas automaticamente — começar com import CSV simples.
- Painel de transparência: "como o motor te recomenda esta tarefa" mostrando os sinais usados (tags em comum, correlatas, follows, proximidade).

### Frente 3 — Confiança e governança (Safety measures do artigo)
O artigo dedica uma seção inteira a isso. O app tem denúncias, bloqueios e verificação, mas faltam três peças.

- **Modo anônimo** para posts/comentários/polls, mantendo o vínculo interno com o perfil para sanções e flags (visível só para moderação).
- **Onboarding por convite** com grafo de convites: cada usuário recebe N convites; visualização da rede de quem convidou quem; métrica de confiança herdada.
- **Métrica de confiabilidade** (% de "collab" que viraram conclusão) exibida no perfil ao lado da reputação.
- **Mecanismo estruturado de resolução de conflitos** inspirado em CNV: formulário com perguntas pré-definidas (fatos, sentimentos, necessidades, pedidos), publicação para escrutínio do grupo, votação de síntese, sanção peer-to-peer (oculta conteúdo do sancionado para quem aplicou). Hoje só existe denúncia administrativa.
- (Opcional, futuro) Autenticação biométrica via WebAuthn/passkeys para reforçar "um perfil por pessoa".

### Frente 4 — Dimensão "Planetary Impact" e tarefas como grupos vivos
O artigo descreve interações "request" vs "collab" em cada tarefa e a formação automática de grupos. O TaskMates já tem colaboradores, mas falta a distinção semântica e o feed de impacto enriquecido.

- Distinguir no card da tarefa dois botões: **"Quero participar" (request/apropriação)** e **"Quero ajudar a organizar" (collab/provisão)**, com permissões diferentes (collab edita subtarefas, vota, modera).
- Quando a primeira pessoa interage com uma tarefa de oferta, **criar grupo automaticamente** (chat + polls + subtarefas) — hoje grupos existem por tag, não por tarefa.
- Feed "Impacto" dedicado aos concluídos, com **feedback estruturado** (impressões, aprendizados, sugestões) além do rating numérico atual.
- Pré-popular o inventário com **recursos territoriais** (país → estado → cidade → bairro) como tags-recurso para gestão comunal local.
- Métricas agregadas por tag de recurso (quantas tarefas, quantas pessoas envolvidas, evolução temporal) para suportar análise de comuns.

## Faseamento sugerido

```text
Fase A (mais impacto, mais simples)
  - Gráfico Oferta/Pedido/Pessoal no perfil
  - Métrica de confiabilidade (collab → conclusão)
  - Painel de transparência da recomendação
  - Distinção "participar" vs "ajudar a organizar"

Fase B (governança)
  - Modo anônimo
  - Resolução de conflitos via CNV
  - Onboarding por convite + grafo

Fase C (Capy Vera)
  - Mascote + chat IA
  - Journaling noturno + extração de tarefas
  - Sugestões proativas de match

Fase D (Self + Impact aprofundados)
  - Módulo de metas com progresso
  - Grupo automático por tarefa
  - Feed de Impacto com feedback estruturado
  - Inventário territorial pré-populado
```

## Notas técnicas

- Capy Vera: edge function `capy-vera-chat` chamando Lovable AI Gateway; tabela `capy_conversations` (user_id, messages jsonb); tabela `capy_extracted_tasks` para sugestões pendentes.
- Metas: tabela `personal_goals` (id, user_id, title, description, deadline, status) + `goal_task_links` (goal_id, task_id, weight).
- Confiabilidade: view materializada sobre `task_collaborators` cruzando `approval_status='approved'` com `tasks.status='completed'`.
- Modo anônimo: coluna `is_anonymous boolean` em comments/polls; RLS continua amarrando ao `user_id` real, mas o `public_profiles` esconde a identidade exceto para admins/moderação.
- Convites: tabela `invitations` (code, inviter_id, invitee_id, used_at); `invite_quota` por usuário; trigger no signup vincula `inviter_id` ao novo perfil.
- Conflitos: tabela `conflict_cases` + `conflict_statements` + `conflict_votes` reutilizando o sistema de polls.
- Grupo automático por tarefa: extensão da lógica atual de auto-grupos em chat, disparada na primeira aprovação de collaborator.
- Recursos territoriais: seed via Nominatim ou IBGE no setup inicial, marcados com `tag_kind='resource_location'`.

Próximo passo proposto: aprovar este plano e começar pela Fase A, que é puramente frontend + queries agregadas e entrega valor visível rapidamente.
