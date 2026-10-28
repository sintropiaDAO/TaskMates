import { createFileRoute } from "@tanstack/react-router";
import Badges from "@/pages/Badges";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/badges/$userId")({
  staticData: { sitemap: false },
  component: Badges,
  head: () => taskmatesPageHead('Conquistas e badges', 'Acompanhe conquistas em habilidades, colaboração e impacto no TaskMates.'),
});
