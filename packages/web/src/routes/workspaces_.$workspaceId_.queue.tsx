import { createFileRoute, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useQueueStatus } from "@/api/queries";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Body, PageTitle } from "@/components/ui/typography";
import { DreamProgressPanel } from "@/components/workspaces/DreamProgressPanel";

export const Route = createFileRoute("/workspaces_/$workspaceId_/queue")({
	component: WorkspaceQueuePage,
});

function WorkspaceQueuePage() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const { data, isLoading, error } = useQueueStatus(workspaceId);

	return (
		<div className="page-container page-container--wide">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<Breadcrumb />
				<div className="flex items-center gap-2 mb-1">
					<Activity
						className="w-5 h-5 flex-shrink-0"
						style={{ color: "var(--accent)" }}
						strokeWidth={1.5}
					/>
					<PageTitle>Queue &amp; dreams</PageTitle>
				</div>
				<Body className="leading-none">
					Live view of in-flight dream, representation, and summary work
				</Body>
			</motion.div>

			<div className="mt-8">
				<DreamProgressPanel
					workspaceId={workspaceId}
					data={data}
					isLoading={isLoading}
					error={error instanceof Error ? error : null}
				/>
			</div>
		</div>
	);
}
