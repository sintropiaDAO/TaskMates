import { createFileRoute } from "@tanstack/react-router";
import ProfileEdit from "@/pages/ProfileEdit";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/profile/edit")({
  staticData: { sitemap: false },
  component: ProfileEdit,
  head: () => taskmatesPageHead('Editar perfil', 'Atualize sua apresentação e seus potenciais no TaskMates.'),
});
