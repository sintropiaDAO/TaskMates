import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/pages/ResetPassword";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  component: ResetPassword,
  head: () => taskmatesPageHead('Redefinir senha', 'Escolha uma nova senha para sua conta no TaskMates.'),
});
