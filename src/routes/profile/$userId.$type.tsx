import { createFileRoute } from "@tanstack/react-router";
import FollowList from "@/pages/FollowList";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/profile/$userId/$type")({
  staticData: { sitemap: false },
  component: FollowList,
  head: ({ params }) => taskmatesPageHead(params.type === 'followers' ? 'Seguidores' : 'Seguindo', 'Explore conexões entre pessoas da comunidade TaskMates.'),
});
