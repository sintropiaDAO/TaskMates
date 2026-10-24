import { createFileRoute } from "@tanstack/react-router";
import JourneyDetail from "@/pages/JourneyDetail";

export const Route = createFileRoute("/journeys/$id")({
  staticData: { sitemap: false },
  component: JourneyDetail,
  head: () => ({
    meta: [
      { title: "Jornada · TaskMates" },
      { name: "description", content: "Participe desta jornada no TaskMates, cumpra as etapas e ganhe multiplicador de EXP." },
      { property: "og:title", content: "Jornada · TaskMates" },
      { property: "og:description", content: "Cumpra as etapas desta jornada e ganhe multiplicador de EXP." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
