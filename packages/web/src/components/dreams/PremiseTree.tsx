import { ChevronRight, CornerDownRight, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Caption, MonoCaption, Muted } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { COLOR } from "@/lib/constants";
import { type ConclusionType, inferConclusionType, type PremiseNode } from "@/lib/dreams";

const TYPE_BADGE: Record<
	ConclusionType,
	{ label: string; bg: string; fg: string; border: string }
> = {
	explicit: {
		label: "explicit",
		bg: "rgba(148,163,184,0.10)",
		fg: "var(--text-2)",
		border: "rgba(148,163,184,0.25)",
	},
	deductive: {
		label: "deductive",
		bg: COLOR.accentSubtle,
		fg: "var(--accent-text)",
		border: COLOR.accentBorder,
	},
	inductive: {
		label: "inductive",
		bg: "rgba(245,158,11,0.10)",
		fg: COLOR.warning,
		border: COLOR.warningBorder,
	},
};

export function ConclusionTypeBadge({ type }: { type: ConclusionType }) {
	const cfg = TYPE_BADGE[type];
	return (
		<span
			className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wide"
			style={{ background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.border}` }}
		>
			{cfg.label}
		</span>
	);
}

interface PremiseTreeProps {
	root: PremiseNode;
}

export function PremiseTree({ root }: PremiseTreeProps) {
	if (root.children.length === 0) {
		return <Muted className="italic">No upstream premises recorded for this conclusion.</Muted>;
	}
	return (
		<ul className="space-y-1.5" aria-label="Premise tree">
			{root.children.map((child, i) => (
				<PremiseTreeNode key={`${child.conclusionId}-${i}`} node={child} />
			))}
		</ul>
	);
}

function PremiseTreeNode({ node }: { node: PremiseNode }) {
	const { mask } = useDemo();
	const [expanded, setExpanded] = useState(false);
	const hasChildren = node.children.length > 0;
	const conclusion = node.conclusion;
	const type: ConclusionType | null = conclusion ? inferConclusionType(conclusion) : null;

	const indent = Math.min(node.depth, 4) * 12;

	return (
		<li style={{ marginLeft: `${indent}px` }}>
			<div
				className="rounded-lg p-2.5 text-xs"
				style={{
					background: "var(--surface)",
					border: "1px solid var(--border)",
				}}
			>
				<div className="flex items-start gap-2">
					{hasChildren ? (
						<button
							type="button"
							onClick={() => setExpanded((v) => !v)}
							className="mt-0.5 p-0.5 rounded transition-colors"
							style={{ color: "var(--text-3)" }}
							aria-expanded={expanded}
							aria-label={expanded ? "Collapse premises" : "Expand premises"}
						>
							<ChevronRight
								className="w-3 h-3 transition-transform"
								style={{ transform: expanded ? "rotate(90deg)" : undefined }}
								strokeWidth={2}
							/>
						</button>
					) : (
						<CornerDownRight
							className="w-3 h-3 mt-1 shrink-0"
							style={{ color: "var(--text-4)" }}
							strokeWidth={1.5}
						/>
					)}

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5 mb-1 flex-wrap">
							{type && <ConclusionTypeBadge type={type} />}
							{node.cycle && (
								<span
									className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
									style={{
										background: COLOR.warningDim,
										color: COLOR.warning,
										border: `1px solid ${COLOR.warningBorder}`,
									}}
									title="Cycle in reasoning tree — already shown upstream"
								>
									<RefreshCcw className="w-2.5 h-2.5" strokeWidth={1.5} />
									cycle
								</span>
							)}
							<MonoCaption className="truncate">{mask(node.conclusionId)}</MonoCaption>
						</div>
						{conclusion ? (
							<p className="leading-snug" style={{ color: "var(--text-2)" }}>
								{mask(conclusion.content)}
							</p>
						) : (
							<Caption className="italic">
								Premise not in current page — fetch more conclusions to expand.
							</Caption>
						)}
					</div>
				</div>
			</div>
			{expanded && hasChildren && (
				<ul className="mt-1.5 space-y-1.5">
					{node.children.map((child, i) => (
						<PremiseTreeNode key={`${child.conclusionId}-${i}`} node={child} />
					))}
				</ul>
			)}
		</li>
	);
}
