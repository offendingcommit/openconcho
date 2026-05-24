import { createFileRoute } from "@tanstack/react-router";
import { DreamList } from "@/components/dreams/DreamList";

export const Route = createFileRoute("/workspaces_/$workspaceId_/dreams")({
	component: DreamList,
});
