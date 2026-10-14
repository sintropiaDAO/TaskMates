import { createFileRoute } from "@tanstack/react-router";
import PublicProfile from "@/pages/PublicProfile";

export const Route = createFileRoute("/profile/$userId")({
  staticData: { sitemap: false },
  component: PublicProfile,
});
