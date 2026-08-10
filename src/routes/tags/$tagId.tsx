import { createFileRoute } from "@tanstack/react-router";
import TagDetail from "@/pages/TagDetail";

export const Route = createFileRoute("/tags/$tagId")({
  component: TagDetail,
});
