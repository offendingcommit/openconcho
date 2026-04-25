import { createFileRoute } from "@tanstack/react-router";
import { PeerDetail } from "@/components/peers/PeerDetail";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers_/$peerId")({
	component: PeerDetail,
});
