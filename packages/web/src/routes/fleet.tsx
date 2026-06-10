import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fleet")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
