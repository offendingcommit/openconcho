import { createFileRoute, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Body, PageTitle } from "@/components/ui/typography";
import { DreamProgressPanel } from "@/components/workspaces/DreamProgressPanel";
import type { StaleQueueState } from "@/hooks/useStaleQueueDetection";

export const Route = createFileRoute("/_dev/dream-progress")({
	component: DreamProgressShowcase,
});

const WORKSPACE_ID = "ws_benchmark_alpha";

const IDLE = {
	total_work_units: 142,
	completed_work_units: 142,
	in_progress_work_units: 0,
	pending_work_units: 0,
	sessions: null,
};

const ACTIVE = {
	total_work_units: 64,
	completed_work_units: 38,
	in_progress_work_units: 4,
	pending_work_units: 22,
	sessions: {
		sess_2024_q4_eval_run_07: {
			total_work_units: 28,
			completed_work_units: 17,
			in_progress_work_units: 2,
			pending_work_units: 9,
		},
		sess_2024_q4_eval_run_08: {
			total_work_units: 24,
			completed_work_units: 14,
			in_progress_work_units: 1,
			pending_work_units: 9,
		},
		sess_diagnostics_cold_start: {
			total_work_units: 12,
			completed_work_units: 7,
			in_progress_work_units: 1,
			pending_work_units: 4,
		},
	},
};

const STALE = {
	total_work_units: 18,
	completed_work_units: 11,
	in_progress_work_units: 1,
	pending_work_units: 6,
	sessions: {
		sess_induction_specialist_test: {
			total_work_units: 18,
			completed_work_units: 11,
			in_progress_work_units: 1,
			pending_work_units: 6,
		},
	},
};

const STALE_OVERRIDE: StaleQueueState = {
	stalledSince: Date.now() - 35 * 60 * 1000,
	elapsedMs: 35 * 60 * 1000,
	isStale: true,
};

function DreamProgressShowcase() {
	if (!import.meta.env.DEV) {
		return <Navigate to="/" />;
	}
	return (
		<div className="page-container page-container--wide space-y-8">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<PageTitle>Dream Progress — showcase</PageTitle>
				<Body className="leading-none">
					Three states rendered with mock data. DEV-only; used for documentation screenshots.
				</Body>
			</motion.div>

			<section>
				<h3
					className="text-xs font-mono uppercase tracking-wider mb-3"
					style={{ color: "var(--text-3)" }}
				>
					Idle
				</h3>
				<DreamProgressPanel workspaceId={WORKSPACE_ID} data={IDLE} isLoading={false} error={null} />
			</section>

			<section>
				<h3
					className="text-xs font-mono uppercase tracking-wider mb-3"
					style={{ color: "var(--text-3)" }}
				>
					Active
				</h3>
				<DreamProgressPanel
					workspaceId={WORKSPACE_ID}
					data={ACTIVE}
					isLoading={false}
					error={null}
				/>
			</section>

			<section>
				<h3
					className="text-xs font-mono uppercase tracking-wider mb-3"
					style={{ color: "var(--text-3)" }}
				>
					Stalled (&gt;30m)
				</h3>
				<DreamProgressPanel
					workspaceId={WORKSPACE_ID}
					data={STALE}
					isLoading={false}
					error={null}
					staleOverride={STALE_OVERRIDE}
				/>
			</section>
		</div>
	);
}
