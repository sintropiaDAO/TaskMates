import { createFileRoute } from "@tanstack/react-router";
import SharePage from "@/pages/SharePage";

export const Route = createFileRoute("/share/$type/$id")({
  component: SharePage,
});
