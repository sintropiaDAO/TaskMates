import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  component: Auth,
  head: () => taskmatesPageHead('Entrar', 'Entre no TaskMates para colaborar com pessoas e comunidades regenerativas.'),
});
