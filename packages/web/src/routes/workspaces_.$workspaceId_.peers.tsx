import { createFileRoute } from "@tanstack/react-router";
import { PeerList } from "@/components/peers/PeerList";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers")({
	component: PeerList,
});
