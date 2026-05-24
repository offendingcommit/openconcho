import { createFileRoute } from "@tanstack/react-router";
import { FleetDashboard } from "@/components/fleet/FleetDashboard";

export const Route = createFileRoute("/fleet")({
	component: FleetDashboard,
});
