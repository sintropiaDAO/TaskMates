import { createFileRoute } from "@tanstack/react-router";
import PotentialsQuiz from "@/pages/PotentialsQuiz";

export const Route = createFileRoute("/quiz")({
  component: PotentialsQuiz,
});
