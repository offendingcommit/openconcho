import { createFileRoute, redirect } from "@tanstack/react-router";

type ExploreSearch = {
	workspace?: string;
	view?: "sessions" | "peers" | "conclusions" | "webhooks";
	session?: string;
	peer?: string;
};

export const Route = createFileRoute("/explore")({
	validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
		workspace: typeof search.workspace === "string" ? search.workspace : undefined,
		view:
			search.view === "sessions" ||
			search.view === "peers" ||
			search.view === "conclusions" ||
			search.view === "webhooks"
				? search.view
				: undefined,
		session: typeof search.session === "string" ? search.session : undefined,
		peer: typeof search.peer === "string" ? search.peer : undefined,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => {
		const { workspace, view, session, peer } = deps;

		if (!workspace) {
			throw redirect({ to: "/workspaces" as never });
		}

		if (view === "sessions" && session) {
			throw redirect({
				to: "/workspaces/$workspaceId/sessions/$sessionId" as never,
				params: { workspaceId: workspace, sessionId: session } as never,
			});
		}
		if (view === "sessions") {
			throw redirect({
				to: "/workspaces/$workspaceId/sessions" as never,
				params: { workspaceId: workspace } as never,
			});
		}
		if (view === "peers" && peer) {
			throw redirect({
				to: "/workspaces/$workspaceId/peers/$peerId" as never,
				params: { workspaceId: workspace, peerId: peer } as never,
			});
		}
		if (view === "peers") {
			throw redirect({
				to: "/workspaces/$workspaceId/peers" as never,
				params: { workspaceId: workspace } as never,
			});
		}
		if (view === "conclusions") {
			throw redirect({
				to: "/workspaces/$workspaceId/conclusions" as never,
				params: { workspaceId: workspace } as never,
			});
		}
		if (view === "webhooks") {
			throw redirect({
				to: "/workspaces/$workspaceId/webhooks" as never,
				params: { workspaceId: workspace } as never,
			});
		}

		throw redirect({
			to: "/workspaces/$workspaceId" as never,
			params: { workspaceId: workspace } as never,
		});
	},
});
