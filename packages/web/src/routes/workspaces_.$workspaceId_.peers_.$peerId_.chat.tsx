import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/components/chat/ChatPage";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers_/$peerId_/chat")({
	component: ChatPage,
});
