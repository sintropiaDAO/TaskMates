import { createFileRoute } from "@tanstack/react-router";
import JourneyEditor from "@/pages/JourneyEditor";

export const Route = createFileRoute("/journeys/new")({
  staticData: { sitemap: false },
  component: JourneyEditor,
  head: () => ({
    meta: [
      { title: "Criar Jornada · TaskMates" },
      { name: "description", content: "Monte uma jornada de etapas, indicadores e recompensas para a comunidade TaskMates." },
      { property: "og:title", content: "Criar Jornada · TaskMates" },
      { property: "og:description", content: "Monte uma jornada de etapas, indicadores e recompensas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
