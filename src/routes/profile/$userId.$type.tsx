import { createFileRoute } from "@tanstack/react-router";
import FollowList from "@/pages/FollowList";

export const Route = createFileRoute("/profile/$userId/$type")({
  component: FollowList,
});
