import { createFileRoute } from "@tanstack/react-router";
import { getPublicPortfolio } from "@/lib/portfolio.functions";
import PortfolioPage from "@/pages/PortfolioPage";

export const Route = createFileRoute("/p/$slug")({
  staticData: { sitemap: false },
  loader: async ({ params }) => {
    try {
      return await getPublicPortfolio({ data: { slug: params.slug, view: true } });
    } catch {
      return { found: false } as const;
    }
  },
  component: PortfolioPage,
  head: ({ params, loaderData }) => {
    const d = loaderData as Awaited<ReturnType<typeof getPublicPortfolio>> | undefined;
    const m = d?.metrics;
    const title = d?.found ? `${d.title} · Portfólio de ${d.owner?.name ?? "TaskMates"}` : "Portfólio · TaskMates";
    const desc = d?.found && m
      ? [d.tag ? `#${d.tag.name}` : null, `${m.tasks} tarefas concluídas`, `${m.products} produtos`, `${m.polls} opiniões`, `${m.people} pessoas conectadas`].filter(Boolean).join(" • ")
      : "Portfólio de impacto regenerativo no TaskMates";
    const url = `https://taskmates.app/p/${params.slug}`;
    const image = d?.found && d.cover && /^https:\/\//.test(d.cover) ? d.cover : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(image ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});
