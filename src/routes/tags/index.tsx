import { createFileRoute } from "@tanstack/react-router";
import TagsList from "@/pages/TagsList";

export const Route = createFileRoute("/tags/")({
  staticData: { sitemap: false },
  component: TagsList,
});
