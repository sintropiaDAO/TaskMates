import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/dashboard")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'TaskMates — Seu espaço de colaboração' },
      { name: 'description', content: 'Encontre comunidades, pessoas e atividades e acompanhe seu Status do Aventureiro no TaskMates.' },
      { property: 'og:title', content: 'TaskMates — Seu espaço de colaboração' },
      { property: 'og:description', content: 'Encontre comunidades, pessoas e atividades e acompanhe seu Status do Aventureiro no TaskMates.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Dashboard,
});
