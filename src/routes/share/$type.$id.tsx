import { createFileRoute } from "@tanstack/react-router";
import SharePage from "@/pages/SharePage";
import { getItemSharePreview } from "@/lib/link-preview.functions";

const TYPE_LABEL: Record<string, string> = {
  task: "Tarefa",
  poll: "Opinião",
  product: "Produto",
};

const FALLBACK_IMAGE = "https://taskmates.app/og-default.jpg";

export const Route = createFileRoute("/share/$type/$id")({
  component: SharePage,
  loader: async ({ params }) => {
    const type = params.type as "task" | "poll" | "product";
    if (!["task", "poll", "product"].includes(type)) return null;
    try {
      return await getItemSharePreview({ data: { type, id: params.id } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const label = TYPE_LABEL[params.type] ?? "TaskMates";
    const isPublic = !!loaderData && loaderData.found && !loaderData.private;
    const title = isPublic && loaderData?.title
      ? `${loaderData.title} · ${label} no TaskMates`
      : "TaskMates - Colaboração Regenerativa";
    const description = (isPublic && loaderData?.description)
      || "Plataforma colaborativa de tarefas e habilidades para comunidades regenerativas";
    const image = (isPublic && loaderData?.image) || FALLBACK_IMAGE;
    const url = `https://taskmates.app/share/${params.type}/${params.id}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});
