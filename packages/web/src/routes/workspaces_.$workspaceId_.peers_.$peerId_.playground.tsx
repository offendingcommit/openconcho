import { createFileRoute } from "@tanstack/react-router";
import { DialecticPlayground } from "@/components/playground/DialecticPlayground";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers_/$peerId_/playground")({
	component: DialecticPlayground,
});
