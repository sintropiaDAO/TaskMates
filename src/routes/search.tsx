import { createFileRoute } from "@tanstack/react-router";
import UserSearch from "@/pages/UserSearch";

export const Route = createFileRoute("/search")({
  component: UserSearch,
});
