import { createFileRoute } from "@tanstack/react-router";
import PublicProfile from "@/pages/PublicProfile";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/profile/$userId")({
  staticData: { sitemap: false },
  component: PublicProfile,
  head: () => taskmatesPageHead('Perfil do aventureiro', 'Conheça potenciais, atividades e conquistas compartilhadas no TaskMates.'),
});
