import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Caption } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import type { Instance } from "@/lib/config";
import {
	type FleetDreamStepResult,
	type FleetInstanceSummary,
	fanOutDreams,
	planFleetTargets,
	summarizeByInstance,
} from "@/lib/fleetDream";
import { toast } from "@/lib/toast";

type Phase = "idle" | "planning" | "running" | "done";

interface Props {
	open: boolean;
	onClose: () => void;
}

export function FleetDreamDialog({ open, onClose }: Props) {
	const { instances } = useInstances();
	const [phase, setPhase] = useState<Phase>("idle");
	const [planError, setPlanError] = useState<string | null>(null);
	const [perInstanceErrors, setPerInstanceErrors] = useState<Array<{ name: string; msg: string }>>(
		[],
	);
	const [summary, setSummary] = useState<Map<string, FleetInstanceSummary>>(new Map());
	const [totalTargets, setTotalTargets] = useState(0);
	const [completed, setCompleted] = useState(0);
	const cancelled = useRef(false);

	const reset = useCallback(() => {
		setPhase("idle");
		setPlanError(null);
		setPerInstanceErrors([]);
		setSummary(new Map());
		setTotalTargets(0);
		setCompleted(0);
	}, []);

	useEffect(() => {
		if (!open) reset();
	}, [open, reset]);

	const handleRun = async () => {
		cancelled.current = false;
		reset();
		setPhase("planning");
		const errors: Array<{ name: string; msg: string }> = [];
		const targets = await planFleetTargets(instances, {
			onInstanceError: (inst, err) => errors.push({ name: inst.name, msg: err.message }),
		});
		if (cancelled.current) return;
		setPerInstanceErrors(errors);
		if (targets.length === 0) {
			setPlanError(
				errors.length > 0
					? "No targets found — every instance failed to list workspaces or peers."
					: "No workspaces or peers found on any configured instance.",
			);
			setPhase("done");
			return;
		}

		setTotalTargets(targets.length);
		setPhase("running");

		const liveResults: FleetDreamStepResult[] = [];
		await fanOutDreams(targets, {
			onProgress: (result) => {
				if (cancelled.current) return;
				if (result.status === "success" || result.status === "error") {
					liveResults.push(result);
					setCompleted(liveResults.length);
					setSummary(summarizeByInstance(liveResults));
				}
			},
		});

		if (cancelled.current) return;
		const finalSummary = summarizeByInstance(liveResults);
		const totalOk = liveResults.filter((r) => r.status === "success").length;
		const totalFail = liveResults.length - totalOk;
		setSummary(finalSummary);
		setPhase("done");
		if (totalFail === 0) {
			toast(`Queued ${totalOk} dreams across ${finalSummary.size} instance(s)`, {
				kind: "success",
			});
		} else {
			toast(`Dreamed ${totalOk}, ${totalFail} failed — see dialog`, { kind: "error" });
		}
	};

	const handleClose = () => {
		cancelled.current = true;
		onClose();
	};

	const isBusy = phase === "planning" || phase === "running";

	return (
		<FormModal open={open} title="Dream the fleet" onClose={handleClose} maxWidth="max-w-lg">
			<div className="space-y-4">
				<Caption as="p">
					Fires <code className="font-mono">schedule_dream</code> for every peer in every workspace
					on every configured instance. Useful for kicking benchmarks without waiting for the cron.
				</Caption>

				{instances.length === 0 ? (
					<div
						className="rounded-lg p-3 text-xs"
						style={{
							background: "rgba(245,158,11,0.08)",
							border: "1px solid rgba(245,158,11,0.2)",
							color: "var(--text-2)",
						}}
					>
						No instances configured. Add one in Settings before dreaming the fleet.
					</div>
				) : (
					<InstancesList instances={instances} summary={summary} phase={phase} />
				)}

				{phase === "running" && totalTargets > 0 && (
					<ProgressBar completed={completed} total={totalTargets} />
				)}

				{planError && (
					<div className="rounded-lg p-3 text-xs" style={{ color: "#f87171" }}>
						{planError}
					</div>
				)}

				{perInstanceErrors.length > 0 && (
					<div
						className="rounded-lg p-3 text-xs space-y-1"
						style={{
							background: "rgba(239,68,68,0.06)",
							border: "1px solid rgba(239,68,68,0.2)",
						}}
					>
						<div className="font-medium" style={{ color: "#f87171" }}>
							Instance listing errors
						</div>
						{perInstanceErrors.map((e) => (
							<div key={e.name} className="font-mono" style={{ color: "var(--text-3)" }}>
								<span style={{ color: "var(--text-2)" }}>{e.name}:</span> {e.msg}
							</div>
						))}
					</div>
				)}

				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="surface" size="sm" onClick={handleClose}>
						{phase === "done" ? "Close" : "Cancel"}
					</Button>
					<Button
						type="button"
						variant="accent"
						size="sm"
						onClick={handleRun}
						disabled={isBusy || instances.length === 0}
					>
						{phase === "planning"
							? "Planning..."
							: phase === "running"
								? `Dreaming ${completed}/${totalTargets}...`
								: phase === "done"
									? "Run again"
									: "Dream fleet"}
					</Button>
				</div>
			</div>
		</FormModal>
	);
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
	const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
	return (
		<div className="space-y-1">
			<div className="flex justify-between text-xs" style={{ color: "var(--text-3)" }}>
				<span>Progress</span>
				<span className="font-mono">
					{completed} / {total}
				</span>
			</div>
			<div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
				<motion.div
					className="h-full"
					style={{ background: "var(--accent)" }}
					initial={{ width: 0 }}
					animate={{ width: `${pct}%` }}
					transition={{ duration: 0.25 }}
				/>
			</div>
		</div>
	);
}

function InstancesList({
	instances,
	summary,
	phase,
}: {
	instances: Instance[];
	summary: Map<string, FleetInstanceSummary>;
	phase: Phase;
}) {
	return (
		<div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
			{instances.map((inst, i) => {
				const s = summary.get(inst.id);
				return (
					<div
						key={inst.id}
						className="flex items-center gap-3 px-3 py-2.5"
						style={{
							borderTop: i > 0 ? "1px solid var(--border)" : undefined,
							background: "var(--bg-2)",
						}}
					>
						<InstanceStatusIcon instanceId={inst.id} summary={s} phase={phase} />
						<div className="flex-1 min-w-0">
							<div className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
								{inst.name}
							</div>
							<div className="text-xs font-mono truncate" style={{ color: "var(--text-4)" }}>
								{inst.baseUrl.replace(/^https?:\/\//, "")}
							</div>
						</div>
						<InstanceCounts summary={s} phase={phase} />
					</div>
				);
			})}
		</div>
	);
}

function InstanceStatusIcon({
	instanceId,
	summary,
	phase,
}: {
	instanceId: string;
	summary: FleetInstanceSummary | undefined;
	phase: Phase;
}) {
	if (phase === "idle" || phase === "planning") {
		return <Sparkles className="w-4 h-4 shrink-0" style={{ color: "var(--text-4)" }} />;
	}
	if (!summary) {
		return <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: "var(--text-4)" }} />;
	}
	if (summary.failed > 0) {
		return (
			<AlertCircle key={instanceId} className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
		);
	}
	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={summary.total}
				initial={{ scale: 0.6, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
			>
				<CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#34d399" }} />
			</motion.div>
		</AnimatePresence>
	);
}

function InstanceCounts({
	summary,
	phase,
}: {
	summary: FleetInstanceSummary | undefined;
	phase: Phase;
}) {
	if (phase === "idle" || phase === "planning") return null;
	if (!summary) {
		return (
			<span className="text-xs font-mono" style={{ color: "var(--text-4)" }}>
				waiting…
			</span>
		);
	}
	return (
		<span className="text-xs font-mono whitespace-nowrap" style={{ color: "var(--text-3)" }}>
			<span style={{ color: "#34d399" }}>{summary.success}</span>
			{summary.failed > 0 && (
				<>
					<span> / </span>
					<span style={{ color: "#f87171" }}>{summary.failed} failed</span>
				</>
			)}
			<span style={{ color: "var(--text-4)" }}> / {summary.total}</span>
		</span>
	);
}
