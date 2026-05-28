import { createFileRoute } from "@tanstack/react-router";
import { SeedKitsView } from "@/components/seed-kits/SeedKitsView";

export const Route = createFileRoute("/seed-kits")({
	component: SeedKitsView,
});
