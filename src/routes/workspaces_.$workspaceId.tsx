import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceDetail } from "@/components/workspaces/WorkspaceDetail";

export const Route = createFileRoute("/workspaces_/$workspaceId")({
	component: WorkspaceDetail,
});
