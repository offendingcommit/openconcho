import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { Boxes, ChevronRight, Clock } from "lucide-react";
import { useWorkspaces } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageTitle, Muted, MonoCaption } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";
import type { components } from "@/api/schema.d.ts";

type Workspace = components["schemas"]["Workspace"];

const container: Variants = {
	hidden: { opacity: 0 },
	show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
	hidden: { opacity: 0, y: 12 },
	show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export function WorkspaceList() {
	const [page, setPage] = useState(1);
	const navigate = useNavigate();
	const { data, isLoading, error } = useWorkspaces(page);

	const workspaces: Workspace[] = (data as { items?: Workspace[] } | undefined)?.items ?? [];
	const totalPages = (data as { pages?: number } | undefined)?.pages ?? 1;
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	return (
		<div className="p-8 max-w-3xl mx-auto">
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35 }}
				className="mb-8"
			>
				<div className="flex items-center gap-2 mb-1">
					<Boxes className="w-5 h-5" style={{ color: "#6366f1" }} strokeWidth={1.5} />
					<PageTitle>Workspaces</PageTitle>
					{total > 0 && (
						<span
							className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
							style={{
								background: COLOR.accentSubtle,
								color: COLOR.accentText,
								border: `1px solid ${COLOR.accentBorder}`,
							}}
						>
							{total}
						</span>
					)}
				</div>
				<Muted>All workspaces in your Honcho instance</Muted>
			</motion.div>

			<ErrorAlert error={error instanceof Error ? error : null} />
			{isLoading && <PageLoader />}

			{!isLoading && workspaces.length === 0 && (
				<EmptyState
					icon={Boxes}
					title="No workspaces found"
					description="No workspaces exist yet in this Honcho instance."
				/>
			)}

			{!isLoading && workspaces.length > 0 && (
				<>
					<motion.div
						variants={container}
						initial="hidden"
						animate="show"
						className="space-y-2"
					>
						{workspaces.map((ws) => (
							<motion.button
								key={ws.id}
								variants={item}
								onClick={() =>
									navigate({
										to: "/workspaces/$workspaceId",
										params: { workspaceId: ws.id } as never,
									})
								}
								className="w-full text-left rounded-xl px-5 py-4 group transition-all"
								style={{
									background: "rgba(255,255,255,0.02)",
									border: "1px solid rgba(255,255,255,0.06)",
								}}
								whileHover={{
									background: "rgba(99,102,241,0.06)",
									borderColor: "rgba(99,102,241,0.2)",
									x: 2,
								}}
							>
								<div className="flex items-center justify-between">
									<span
										className="font-mono text-sm font-medium"
										style={{ color: "#c7d2fe" }}
									>
										{ws.id}
									</span>
									<ChevronRight
										className="w-4 h-4 opacity-30 group-hover:opacity-70 transition-opacity"
										style={{ color: "#6366f1" }}
										strokeWidth={1.5}
									/>
								</div>
								{ws.created_at && (
									<div className="flex items-center gap-1.5 mt-2">
										<Clock
											className="w-3 h-3"
											style={{ color: "rgba(148,163,184,0.35)" }}
											strokeWidth={1.5}
										/>
										<MonoCaption>{new Date(ws.created_at).toLocaleString()}</MonoCaption>
									</div>
								)}
							</motion.button>
						))}
					</motion.div>
					<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
				</>
			)}
		</div>
	);
}
