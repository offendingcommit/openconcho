import { createFileRoute, useParams } from "@tanstack/react-router";
import { WebhookManager } from "@/components/workspaces/WebhookManager";

export const Route = createFileRoute("/workspaces_/$workspaceId_/webhooks")({
	component: WebhookManagerPage,
});

function WebhookManagerPage() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	return <WebhookManager workspaceId={workspaceId} />;
}
