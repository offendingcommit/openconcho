import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FlaskConical, Play } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { client } from "@/api/client";
import { REASONING_LEVELS, type ReasoningLevel } from "@/api/queries";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnState {
	status: "idle" | "pending" | "success" | "error";
	content: string | null;
	error: string | null;
	startedAt: number | null;
	endedAt: number | null;
}

type RunResult = { ok: true; content: string | null } | { ok: false; error: string };

const IDLE: ColumnState = {
	status: "idle",
	content: null,
	error: null,
	startedAt: null,
	endedAt: null,
};

// ─── Pure helpers (exported for testing) ─────────────────────────────────────

export function buildInitialColumns(): Record<ReasoningLevel, ColumnState> {
	return Object.fromEntries(REASONING_LEVELS.map((l) => [l, { ...IDLE }])) as Record<
		ReasoningLevel,
		ColumnState
	>;
}

export function latencyMs(col: ColumnState): number | null {
	if (col.startedAt == null || col.endedAt == null) return null;
	return col.endedAt - col.startedAt;
}

// ─── Run-fanout (exported for testing) ───────────────────────────────────────

export interface FanoutDeps {
	now: () => number;
	runOne: (level: ReasoningLevel, query: string) => Promise<RunResult>;
	onStart: (level: ReasoningLevel, startedAt: number) => void;
	onEnd: (level: ReasoningLevel, endedAt: number, result: RunResult) => void;
}

/**
 * Fires the same query at every selected level concurrently. Returns when all
 * settle. Per-column timing is captured via onStart/onEnd so React state updates
 * stay reflective of the network race, not the await order.
 */
export async function fanoutQuery(
	levels: readonly ReasoningLevel[],
	query: string,
	deps: FanoutDeps,
): Promise<void> {
	await Promise.all(
		levels.map(async (level) => {
			const startedAt = deps.now();
			deps.onStart(level, startedAt);
			try {
				const result = await deps.runOne(level, query);
				deps.onEnd(level, deps.now(), result);
			} catch (e) {
				deps.onEnd(level, deps.now(), {
					ok: false,
					error: e instanceof Error ? e.message : String(e),
				});
			}
		}),
	);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DialecticPlayground() {
	const { mask } = useDemo();
	const { workspaceId, peerId } = useParams({ strict: false }) as {
		workspaceId: string;
		peerId: string;
	};
	const qc = useQueryClient();

	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<Record<ReasoningLevel, boolean>>(
		() =>
			Object.fromEntries(REASONING_LEVELS.map((l) => [l, true])) as Record<ReasoningLevel, boolean>,
	);
	const [columns, setColumns] = useState<Record<ReasoningLevel, ColumnState>>(buildInitialColumns);

	const anyPending = useMemo(
		() => REASONING_LEVELS.some((l) => columns[l].status === "pending"),
		[columns],
	);
	const selectedLevels = useMemo(() => REASONING_LEVELS.filter((l) => selected[l]), [selected]);

	const runOne = useCallback(
		async (level: ReasoningLevel, q: string): Promise<RunResult> => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/chat",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { query: q, stream: false, reasoning_level: level },
				},
			);
			if (error) {
				return {
					ok: false,
					error: typeof error === "object" ? JSON.stringify(error) : String(error),
				};
			}
			const content = (data as { content?: string | null } | undefined)?.content ?? null;
			return { ok: true, content };
		},
		[workspaceId, peerId],
	);

	const handleRun = useCallback(async () => {
		const trimmed = query.trim();
		if (!trimmed || anyPending || selectedLevels.length === 0) return;

		setColumns((prev) => {
			const next = { ...prev };
			for (const l of selectedLevels) next[l] = { ...IDLE, status: "pending" };
			return next;
		});

		await fanoutQuery(selectedLevels, trimmed, {
			now: () => performance.now(),
			runOne,
			onStart: (level, startedAt) => {
				setColumns((prev) => ({
					...prev,
					[level]: { ...prev[level], status: "pending", startedAt, endedAt: null },
				}));
			},
			onEnd: (level, endedAt, result) => {
				setColumns((prev) => ({
					...prev,
					[level]: {
						...prev[level],
						endedAt,
						status: result.ok ? "success" : "error",
						content: result.ok ? result.content : null,
						error: result.ok ? null : result.error,
					},
				}));
			},
		});

		qc.invalidateQueries({ queryKey: ["peer-context", workspaceId, peerId] });
	}, [anyPending, peerId, qc, query, runOne, selectedLevels, workspaceId]);

	function toggleLevel(level: ReasoningLevel) {
		setSelected((prev) => ({ ...prev, [level]: !prev[level] }));
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if ((e.key === "Enter" && (e.metaKey || e.ctrlKey)) || (e.key === "Enter" && !e.shiftKey)) {
			e.preventDefault();
			handleRun();
		}
	}

	return (
		<div className="flex flex-col h-screen" style={{ background: "var(--bg)" }}>
			{/* Header */}
			<div
				className="shrink-0 px-6 py-4"
				style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}
			>
				<div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--text-3)" }}>
					<Link
						to="/workspaces/$workspaceId/peers/$peerId"
						params={{ workspaceId, peerId } as never}
						className="hover:underline font-mono"
					>
						{mask(peerId)}
					</Link>
					<span>/</span>
					<span>Playground</span>
				</div>
				<div className="flex items-center gap-2">
					<FlaskConical className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<SectionHeading as="h1" className="mb-0">
						Dialectic reasoning playground
					</SectionHeading>
				</div>
				<p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
					Fire the same query at every reasoning level in parallel — compare answers and latency.
				</p>
			</div>

			{/* Query input */}
			<div
				className="shrink-0 px-4 sm:px-6 py-4"
				style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}
			>
				<div className="flex gap-3 max-w-5xl mx-auto items-end">
					<Textarea
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask once, compare five answers… (Enter to run, Shift+Enter for newline)"
						rows={2}
						className="flex-1 resize-none"
						aria-label="Query"
					/>
					<Button
						variant="primary"
						onClick={handleRun}
						disabled={!query.trim() || anyPending || selectedLevels.length === 0}
						className="self-end mb-0.5"
						aria-label="Run selected levels"
					>
						{anyPending ? (
							<LoadingSpinner size="sm" />
						) : (
							<Play className="w-4 h-4" strokeWidth={1.5} />
						)}
						<span className="hidden sm:block">
							{selectedLevels.length === REASONING_LEVELS.length
								? "Run all levels"
								: `Run ${selectedLevels.length}`}
						</span>
					</Button>
				</div>
				<div className="max-w-5xl mx-auto mt-3 flex flex-wrap gap-2 items-center">
					<span className="text-xs" style={{ color: "var(--text-3)" }}>
						Levels:
					</span>
					{REASONING_LEVELS.map((level) => (
						<label
							key={level}
							className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md cursor-pointer transition-colors"
							style={{
								background: selected[level] ? "var(--accent-dim)" : "var(--surface)",
								color: selected[level] ? "var(--accent-text)" : "var(--text-3)",
								border: `1px solid ${selected[level] ? "var(--accent-border)" : "var(--border)"}`,
							}}
						>
							<input
								type="checkbox"
								checked={selected[level]}
								onChange={() => toggleLevel(level)}
								className="accent-current"
								aria-label={`Include ${level}`}
							/>
							<span className="font-mono">{level}</span>
						</label>
					))}
				</div>
			</div>

			{/* 5-column grid */}
			<div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-[1600px] mx-auto">
					{REASONING_LEVELS.map((level) => (
						<LevelColumn
							key={level}
							level={level}
							state={columns[level]}
							included={selected[level]}
							maskFn={mask}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Per-column subcomponent ─────────────────────────────────────────────────

interface LevelColumnProps {
	level: ReasoningLevel;
	state: ColumnState;
	included: boolean;
	maskFn: (s: string) => string;
}

function LevelColumn({ level, state, included, maskFn }: LevelColumnProps) {
	const ms = latencyMs(state);
	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: included ? 1 : 0.45, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex flex-col rounded-xl min-h-[280px]"
			style={{
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
			}}
			data-level={level}
			data-status={state.status}
			data-testid={`column-${level}`}
		>
			{/* Header */}
			<div
				className="px-3 py-2 flex items-center justify-between"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<div className="flex items-center gap-1.5">
					<span
						className="text-xs font-mono font-medium uppercase tracking-wide"
						style={{ color: "var(--text-1)" }}
					>
						{level}
					</span>
				</div>
				{!included && (
					<span className="text-xs" style={{ color: "var(--text-4)" }}>
						skipped
					</span>
				)}
			</div>

			{/* Body */}
			<div className="flex-1 px-3 py-3 text-sm" style={{ color: "var(--text-2)" }}>
				{state.status === "idle" && (
					<p className="text-xs" style={{ color: "var(--text-4)" }}>
						Awaiting query…
					</p>
				)}
				{state.status === "pending" && (
					<div className="flex items-center gap-2">
						<LoadingSpinner size="sm" />
						<span className="text-xs" style={{ color: "var(--text-3)" }}>
							Thinking…
						</span>
					</div>
				)}
				{state.status === "error" && (
					<p
						className="text-xs whitespace-pre-wrap"
						style={{ color: "var(--destructive, #f87171)" }}
						data-testid={`column-${level}-error`}
					>
						Error: {state.error}
					</p>
				)}
				{state.status === "success" && (
					<p
						className="whitespace-pre-wrap leading-relaxed"
						data-testid={`column-${level}-content`}
					>
						{maskFn(state.content ?? "(empty response)")}
					</p>
				)}
			</div>

			{/* Footer */}
			<div
				className="px-3 py-2 flex items-center justify-between text-xs"
				style={{ borderTop: "1px solid var(--border)", color: "var(--text-4)" }}
			>
				<span data-testid={`column-${level}-latency`}>
					{ms != null ? `${Math.round(ms)} ms` : "—"}
				</span>
				<span>
					{state.content != null ? `${state.content.length.toLocaleString()} chars` : "—"}
				</span>
			</div>
		</motion.div>
	);
}
