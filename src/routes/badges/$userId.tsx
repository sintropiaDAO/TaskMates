import { createFileRoute } from "@tanstack/react-router";
import Badges from "@/pages/Badges";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/badges/$userId")({
  staticData: { sitemap: false },
  component: Badges,
  head: () => taskmatesPageHead('Selos de Habilidades e Conquistas', 'Explore seus selos, níveis e conquistas na Aventura Regenerativa do TaskMates, com a Capyvera.'),
});
