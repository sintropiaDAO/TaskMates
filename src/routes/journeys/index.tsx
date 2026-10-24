import { createFileRoute } from "@tanstack/react-router";
import MyJourneys from "@/pages/MyJourneys";

export const Route = createFileRoute("/journeys/")({
  staticData: { sitemap: false },
  component: MyJourneys,
  head: () => ({
    meta: [
      { title: "Minhas Jornadas · TaskMates" },
      { name: "description", content: "Acompanhe as jornadas que você participa e gerencie as que criou no TaskMates." },
      { property: "og:title", content: "Minhas Jornadas · TaskMates" },
      { property: "og:description", content: "Acompanhe as jornadas que você participa e gerencie as que criou." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
