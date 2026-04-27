import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail } from "@/components/sessions/SessionDetail";

export const Route = createFileRoute("/workspaces_/$workspaceId_/sessions_/$sessionId")({
	component: SessionDetail,
});
