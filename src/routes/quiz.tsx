import { createFileRoute } from "@tanstack/react-router";
import PotentialsQuiz from "@/pages/PotentialsQuiz";
import { taskmatesPageHead } from '@/lib/page-head';

export const Route = createFileRoute("/quiz")({
  staticData: { sitemap: false },
  component: PotentialsQuiz,
  head: () => taskmatesPageHead('Seus potenciais', 'Descubra habilidades e interesses para colaborar no TaskMates.'),
});
