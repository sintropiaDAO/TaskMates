import { createFileRoute } from "@tanstack/react-router";
import Install from "@/pages/Install";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/install")({
  staticData: { sitemap: true },
  component: Install,
  head: () => taskmatesPageHead('Instalar o aplicativo', 'Adicione o TaskMates à sua tela de início para acompanhar sua comunidade.'),
});
