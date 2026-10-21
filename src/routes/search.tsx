import { createFileRoute } from "@tanstack/react-router";
import UserSearch from "@/pages/UserSearch";

export const Route = createFileRoute("/search")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "TaskMates — Encontre pessoas" },
      { name: "description", content: "Encontre pessoas pelas habilidades, comunidades e interesses no TaskMates." },
      { property: "og:title", content: "TaskMates — Encontre pessoas" },
      { property: "og:description", content: "Conecte-se com pessoas que compartilham habilidades, comunidades e interesses no TaskMates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserSearch,
});
