import { createFileRoute } from "@tanstack/react-router";
import TagsList from "@/pages/TagsList";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/tags/")({
  staticData: { sitemap: false },
  component: TagsList,
  head: () => taskmatesPageHead('Tags e comunidades', 'Encontre habilidades, comunidades e recursos para colaborar no TaskMates.'),
});
