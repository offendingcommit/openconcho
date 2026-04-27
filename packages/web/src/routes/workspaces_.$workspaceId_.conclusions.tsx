import { createFileRoute } from "@tanstack/react-router";
import { ConclusionBrowser } from "@/components/conclusions/ConclusionBrowser";

export const Route = createFileRoute("/workspaces_/$workspaceId_/conclusions")({
	component: ConclusionBrowser,
});
