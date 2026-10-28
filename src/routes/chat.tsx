import { createFileRoute } from "@tanstack/react-router";
import Chat from "@/pages/Chat";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/chat")({
  staticData: { sitemap: false },
  component: Chat,
  head: () => taskmatesPageHead('Conversas', 'Converse com sua rede de colaboração no TaskMates.'),
});
