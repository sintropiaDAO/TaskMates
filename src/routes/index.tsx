import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskMates — Colaboração Regenerativa" },
      { name: "description", content: "Conecte pessoas, tarefas, produtos e decisões coletivas em comunidades regenerativas." },
      { property: "og:title", content: "TaskMates — Colaboração Regenerativa" },
      { property: "og:description", content: "Conecte pessoas, tarefas, produtos e decisões coletivas em comunidades regenerativas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
