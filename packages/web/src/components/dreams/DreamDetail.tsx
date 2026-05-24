import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Eye, Lightbulb, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TimestampChip } from "@/components/shared/TimestampChip";
import { Button } from "@/components/ui/button";
import { Body, Caption, MonoCaption, Muted, SectionHeading } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { COLOR } from "@/lib/constants";
import {
	buildPremiseIndex,
	type ConclusionType,
	type Dream,
	dreamCounts,
	type ExtendedConclusion,
	expandPremiseTree,
	inferConclusionType,
	type PremiseNode,
} from "@/lib/dreams";
import { ConclusionTypeBadge, PremiseTree } from "./PremiseTree";

const COLUMNS: Array<{ type: ConclusionType; label: string; description: string }> = [
	{
		type: "explicit",
		label: "Explicit",
		description: "Surface observations pulled directly from messages",
	},
	{
		type: "deductive",
		label: "Deductive",
		description: "Logical consequences of explicit observations",
	},
	{
		type: "inductive",
		label: "Inductive",
		description: "Generalized patterns inferred from deductives",
	},
];

interface DreamDetailProps {
	dream: Dream;
	onClose: () => void;
}

export function DreamDetail({ dream, onClose }: DreamDetailProps) {
	const { mask } = useDemo();
	const counts = useMemo(() => dreamCounts(dream), [dream]);
	const index = useMemo(() => buildPremiseIndex(dream.conclusions), [dream]);

	const grouped = useMemo(() => {
		const buckets: Record<ConclusionType, ExtendedConclusion[]> = {
			explicit: [],
			deductive: [],
			inductive: [],
		};
		for (const c of dream.conclusions) {
			buckets[inferConclusionType(c)].push(c);
		}
		return buckets;
	}, [dream]);

	return (
		<motion.section
			key={dream.id}
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={{ duration: 0.18 }}
			className="rounded-2xl p-5"
			style={{
				background: "var(--bg-2)",
				border: `1px solid ${COLOR.accentBorder}`,
			}}
		>
			<header className="flex items-start gap-3 mb-5">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap mb-1">
						<Lightbulb className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
						<SectionHeading className="mb-0">Dream detail</SectionHeading>
						<TimestampChip value={dream.latestIso.replace("T", " ").replace(/\.\d+Z?$/, "")} />
					</div>
					<div className="flex items-center gap-2 flex-wrap text-xs">
						<Eye className="w-3 h-3" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
						<MonoCaption>{mask(dream.observer_id)}</MonoCaption>
						{dream.observed_id && (
							<>
								<ChevronRight
									className="w-3 h-3"
									style={{ color: "var(--text-4)" }}
									strokeWidth={2}
								/>
								<MonoCaption>{mask(dream.observed_id)}</MonoCaption>
							</>
						)}
						<span className="mx-1.5" style={{ color: "var(--text-4)" }}>
							·
						</span>
						<Caption>
							{counts.total} conclusion{counts.total === 1 ? "" : "s"}
						</Caption>
					</div>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dream detail">
					<X className="w-4 h-4" strokeWidth={1.5} />
				</Button>
			</header>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{COLUMNS.map((col) => (
					<ColumnPanel
						key={col.type}
						type={col.type}
						label={col.label}
						description={col.description}
						conclusions={grouped[col.type]}
						index={index}
					/>
				))}
			</div>
		</motion.section>
	);
}

interface ColumnPanelProps {
	type: ConclusionType;
	label: string;
	description: string;
	conclusions: ExtendedConclusion[];
	index: Map<string, ExtendedConclusion>;
}

function ColumnPanel({ type, label, description, conclusions, index }: ColumnPanelProps) {
	return (
		<div
			className="rounded-xl p-4 flex flex-col"
			style={{
				background: "var(--surface)",
				border: "1px solid var(--border)",
				minHeight: "8rem",
			}}
		>
			<div className="flex items-center gap-2 mb-1">
				<ConclusionTypeBadge type={type} />
				<span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
					{label}
				</span>
				<span
					className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded-full"
					style={{
						background: "var(--surface)",
						color: "var(--text-3)",
						border: "1px solid var(--border)",
					}}
				>
					{conclusions.length}
				</span>
			</div>
			<Muted className="text-[11px] mb-3">{description}</Muted>

			{conclusions.length === 0 ? (
				<Caption className="italic">No {label.toLowerCase()} conclusions in this dream.</Caption>
			) : (
				<ul className="space-y-2.5">
					{conclusions.map((c) => (
						<li key={c.id}>
							<ConclusionCard conclusion={c} index={index} expandable={type === "inductive"} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

interface ConclusionCardProps {
	conclusion: ExtendedConclusion;
	index: Map<string, ExtendedConclusion>;
	expandable: boolean;
}

function ConclusionCard({ conclusion, index, expandable }: ConclusionCardProps) {
	const { mask } = useDemo();
	const [open, setOpen] = useState(false);
	const tree = useMemo<PremiseNode | null>(
		() => (open ? expandPremiseTree(conclusion.id, index) : null),
		[open, conclusion.id, index],
	);
	const hasPremises = Boolean(
		(conclusion.reasoning_tree?.premises?.length ?? 0) > 0 ||
			(conclusion.premises?.length ?? 0) > 0,
	);

	return (
		<div
			className="rounded-lg p-3 text-xs"
			style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
		>
			<Body className="text-xs whitespace-pre-wrap leading-snug mb-2">
				{mask(conclusion.content)}
			</Body>
			<div className="flex items-center justify-between gap-2">
				<MonoCaption className="truncate">{mask(conclusion.id)}</MonoCaption>
				{expandable && hasPremises && (
					<button
						type="button"
						onClick={() => setOpen((v) => !v)}
						className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
						style={{
							background: open ? COLOR.accentDim : "transparent",
							color: open ? "var(--accent-text)" : "var(--text-3)",
							border: `1px solid ${open ? COLOR.accentBorder : "var(--border)"}`,
						}}
						aria-expanded={open}
					>
						<ChevronRight
							className="w-3 h-3 transition-transform"
							style={{ transform: open ? "rotate(90deg)" : undefined }}
							strokeWidth={2}
						/>
						{open ? "Hide" : "Show"} premises
					</button>
				)}
			</div>

			<AnimatePresence>
				{open && tree && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.18 }}
						className="overflow-hidden"
					>
						<div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLOR.accentBorder}` }}>
							<Caption className="mb-2 block">Reasoning chain</Caption>
							<PremiseTree root={tree} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
