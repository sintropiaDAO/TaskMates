import { createFileRoute } from "@tanstack/react-router";
import JourneyDetail from "@/pages/JourneyDetail";
import { getPublicJourneyPreview } from '@/lib/journey-preview.functions';
import { publicJourneyImage } from '@/lib/journey-preview';

export const Route = createFileRoute("/journeys/$id")({
  staticData: { sitemap: false },
  component: JourneyDetail,
  loader: async ({ params }) => {
    try { return await getPublicJourneyPreview({ data: { id: params.id } }); }
    catch { return null; }
  },
  head: ({ params, loaderData }) => {
    const title = loaderData ? `${loaderData.title} · Jornada no TaskMates` : 'Jornada · TaskMates';
    const description = loaderData?.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
      || 'Participe de uma jornada no TaskMates, cumpra etapas e ganhe multiplicador de EXP.';
    const image = publicJourneyImage(loaderData?.image_url);
    const url = `https://taskmates.app/journeys/${params.id}`;
    return {
      meta: [
        { title }, { name: 'description', content: description },
        { property: 'og:title', content: title }, { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' }, { property: 'og:url', content: url },
        { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: title }, { name: 'twitter:description', content: description },
        ...(image ? [{ property: 'og:image', content: image }, { name: 'twitter:image', content: image }] : []),
      ],
      links: [{ rel: 'canonical', href: url }],
    };
  },
});
