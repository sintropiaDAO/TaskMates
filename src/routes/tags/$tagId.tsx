import { createFileRoute } from "@tanstack/react-router";
import TagDetail from "@/pages/TagDetail";
import { getTagSharePreview } from "@/lib/link-preview.functions";

const FALLBACK_IMAGE = "https://taskmates.app/og-default.jpg";

export const Route = createFileRoute("/tags/$tagId")({
  component: TagDetail,
  loader: async ({ params }) => {
    try {
      return await getTagSharePreview({ data: { tagId: params.tagId } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const isPublic = !!loaderData && loaderData.found && !loaderData.private;
    const title = isPublic && loaderData?.title
      ? `${loaderData.title} · Comunidade no TaskMates`
      : "TaskMates - Colaboração Regenerativa";
    const description = (isPublic && loaderData?.description)
      || "Participe de comunidades regenerativas e colabore em tarefas no TaskMates";
    const image = (isPublic && loaderData?.image) || FALLBACK_IMAGE;
    const url = `https://taskmates.app/tags/${params.tagId}`;

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
