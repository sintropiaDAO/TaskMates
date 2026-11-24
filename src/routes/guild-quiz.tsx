import { createFileRoute } from "@tanstack/react-router";
import GuildQuiz from "@/pages/GuildQuiz";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/guild-quiz")({
  staticData: { sitemap: false },
  component: GuildQuiz,
  head: () => taskmatesPageHead('Qual é a sua Ocupação de Aventureiro?', 'Descubra sua vocação aventureira e receba uma missão para conquistar seu primeiro selo no TaskMates.'),
});
