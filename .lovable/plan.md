# Atualizar a página inicial: novas funcionalidades e casos de uso

## Objetivo
Mostrar o que o TaskMates faz hoje (jornadas, títulos, portfólio público, lives, quiz de vocação) e para quem ele serve, com exemplos concretos por perfil de pessoa.

## Nova ordem da página
1. **Topo (existente, texto revisado)** — "A vida é uma aventura!" + "Aventura Regenerativa com seus amigos". Botões: Começar aventura / Convidar Amigos.
2. **Funcionalidades (atualizada)** — mantém os cards atuais e adiciona:
   - Jornadas: trilhas de etapas com progresso e recompensas
   - Níveis, EXP, selos e títulos de ocupação (Mestre da Guilda, Guardiã da Vila...)
   - Quiz de vocação que cria uma jornada personalizada
   - Portfólio público e relatório compartilhável
   - Lives e rodas de conversa
   - Menções @ e compartilhamento no chat
3. **Casos de uso (nova)** — abas ou cards por perfil, cada um com dor, como o app ajuda e as funções usadas:
   - **Gestores de projetos sociais** — Working Out Loud: registrar ações com provas reais, portfólio público para financiadores e parceiros, relatório de impacto.
   - **Gestores de comunidade** — jornadas como onboarding de novos membros e trilhas de engajamento; acompanhar participantes; enquetes para decisões.
   - **Educadores e jovens** — níveis, títulos e selos que tornam o aprendizado e o voluntariado um jogo; quiz de vocação para descobrir o primeiro objetivo.
   - **Coletivos e hortas comunitárias** — mutirões como eventos, mapa "Perto", troca de produtos e recursos.
   - **Empresas e ESG / voluntariado corporativo** — jornadas de voluntariado para equipes, evidência verificável das ações.
   - **Autocuidado e hábitos pessoais** — jornadas de hábitos (corrida, meditação) com amigos e sequências.
   - **Pesquisadores e ONGs de comportamento** — medir engajamento e mudança de hábito (liga com a seção de pesquisa existente).
4. **Como funciona em 3 passos (nova, curta)** — Crie seu personagem → Entre em jornadas com amigos → Conquiste títulos e mostre seu impacto.
5. **Chamada final e rodapé de pesquisa (existentes, texto revisado)**.

## Visual
Mesma estética solarpunk e claymorphism do app, Capyvera com as poses/fantasias de ocupação já criadas nos casos de uso, animações suaves respeitando movimento reduzido. Bilíngue (português/inglês).

## Detalhes técnicos
- Novo `UseCasesSection.tsx` e `HowItWorksSection.tsx` em `src/components/landing/`; ampliar `FeaturesSection.tsx`; ajustar textos em `Hero.tsx` e `CTASection.tsx`; montar em `src/pages/Index.tsx`.
- Todos os textos via chaves de tradução PT/EN existentes.
- Atualizar título/descrição de compartilhamento da página inicial.
- Somente página inicial: nenhuma mudança em dados ou regras.
