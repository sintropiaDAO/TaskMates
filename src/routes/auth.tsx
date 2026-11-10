import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  component: Auth,
  head: () => taskmatesPageHead('Sua Aventura Regenerativa', 'Entre ou crie seu aventureiro no TaskMates com a Capyvera para cuidar da vida e colaborar com amigos e comunidades.'),
});
