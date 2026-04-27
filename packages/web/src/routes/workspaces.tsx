import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceList } from "@/components/workspaces/WorkspaceList";

export const Route = createFileRoute("/workspaces")({
	component: WorkspaceList,
});
