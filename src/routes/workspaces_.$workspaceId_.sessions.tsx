import { createFileRoute } from "@tanstack/react-router";
import { SessionList } from "@/components/sessions/SessionList";

export const Route = createFileRoute("/workspaces_/$workspaceId_/sessions")({
	component: SessionList,
});
