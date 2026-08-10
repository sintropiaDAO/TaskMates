import { createFileRoute } from "@tanstack/react-router";
import ProfileEdit from "@/pages/ProfileEdit";

export const Route = createFileRoute("/profile/edit")({
  component: ProfileEdit,
});
