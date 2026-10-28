import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/pages/Admin";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  component: Admin,
  head: () => taskmatesPageHead('Administração', 'Gerencie a comunidade, tags e configurações do TaskMates.'),
});
