import { createFileRoute } from "@tanstack/react-router";
import Badges from "@/pages/Badges";

export const Route = createFileRoute("/badges/$userId")({
  staticData: { sitemap: false },
  component: Badges,
});
