import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
	lines: string[];
}

// ALL_CAPS_WORD: — no lowercase letters in key
const CAPS_RE = /^([A-Z][A-Z0-9_]+):\s*([\s\S]*)/;
// Title Case Word: — starts capital, must contain at least one lowercase
const TITLE_RE = /^([A-Z][a-zA-Z0-9][a-zA-Z0-9 ]*):\s*([\s\S]*)/;

type ParsedLine =
	| { kind: "fact"; text: string }
	| { kind: "caps"; key: string; value: string }
	| { kind: "title"; key: string; value: string };

const PALETTE: Array<{ bg: string; text: string; border: string; dot: string }> = [
	{ bg: "rgba(52,211,153,0.08)", text: "#34d399", border: "rgba(52,211,153,0.25)", dot: "#34d399" },
	{ bg: "rgba(245,158,11,0.08)", text: "#f59e0b", border: "rgba(245,158,11,0.25)", dot: "#f59e0b" },
	{ bg: "rgba(14,165,233,0.08)", text: "#38bdf8", border: "rgba(14,165,233,0.25)", dot: "#38bdf8" },
	{ bg: "rgba(236,72,153,0.08)", text: "#f472b6", border: "rgba(236,72,153,0.25)", dot: "#f472b6" },
	{ bg: "rgba(168,85,247,0.08)", text: "#c084fc", border: "rgba(168,85,247,0.25)", dot: "#c084fc" },
	{ bg: "rgba(239,68,68,0.08)", text: "#f87171", border: "rgba(239,68,68,0.25)", dot: "#f87171" },
	{ bg: "rgba(34,197,94,0.08)", text: "#4ade80", border: "rgba(34,197,94,0.25)", dot: "#4ade80" },
	{ bg: "rgba(251,146,60,0.08)", text: "#fb923c", border: "rgba(251,146,60,0.25)", dot: "#fb923c" },
];

function hashPalette(word: string): number {
	let h = 5381;
	for (let i = 0; i < word.length; i++) h = ((h * 33) ^ word.charCodeAt(i)) >>> 0;
	return h % PALETTE.length;
}

function toLabel(key: string): string {
	const s = key.toLowerCase().replace(/_/g, " ");
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseLine(line: string): ParsedLine {
	const caps = CAPS_RE.exec(line);
	if (caps) return { kind: "caps", key: caps[1], value: caps[2].trim() };
	const title = TITLE_RE.exec(line);
	if (title && /[a-z]/.test(title[1])) {
		return { kind: "title", key: title[1], value: title[2].trim() };
	}
	return { kind: "fact", text: line };
}

interface CapsGroup {
	key: string;
	items: string[];
}

interface Parsed {
	titlePairs: Array<{ key: string; value: string }>;
	facts: string[];
	capsGroups: CapsGroup[];
}

function parse(lines: string[]): Parsed {
	const titlePairs: Array<{ key: string; value: string }> = [];
	const facts: string[] = [];
	const capsMap = new Map<string, string[]>();
	const capsOrder: string[] = [];

	for (const line of lines) {
		const p = parseLine(line);
		if (p.kind === "title") {
			titlePairs.push({ key: p.key, value: p.value });
		} else if (p.kind === "caps") {
			if (!capsMap.has(p.key)) {
				capsMap.set(p.key, []);
				capsOrder.push(p.key);
			}
			capsMap.get(p.key)?.push(p.value);
		} else {
			facts.push(p.text);
		}
	}

	return {
		titlePairs,
		facts,
		capsGroups: capsOrder.map((k) => ({ key: k, items: capsMap.get(k) ?? [] })),
	};
}

// ─── Metadata table (Title Case: pairs) ──────────────────────────────────────

function MetadataCard({ pairs }: { pairs: Array<{ key: string; value: string }> }) {
	if (pairs.length === 0) return null;
	return (
		<div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-2)" }}>
			<dl className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
				{pairs.map(({ key, value }, i) => (
					<div
						key={key}
						className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5 text-sm"
						style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--bg-3)" }}
					>
						<dt className="font-medium break-words" style={{ color: "var(--text-3)" }}>
							{key}
						</dt>
						<dd className="min-w-0 break-words" style={{ color: "var(--text-1)" }}>
							{value || <span style={{ color: "var(--text-4)" }}>—</span>}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

// ─── Collapsible section (ALL_CAPS: groups + Facts) ───────────────────────────

interface SectionStyle {
	bg: string;
	text: string;
	border: string;
}

const FACTS_STYLE: SectionStyle = {
	bg: COLOR.accentDim,
	text: "#a5b4fc",
	border: COLOR.accentBorder,
};

function CollapsibleSection({
	label,
	count,
	style,
	children,
}: {
	label: string;
	count: number;
	style: SectionStyle;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(true);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${style.border}` }}>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className={cn(
							"w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium",
							"transition-opacity hover:opacity-80",
						)}
						style={{ background: style.bg, color: style.text }}
					>
						<span className="flex items-center gap-2">
							{label}
							<span
								className="text-xs font-mono px-1.5 py-0.5 rounded"
								style={{
									background: "rgba(0,0,0,0.2)",
									color: style.text,
									opacity: 0.75,
								}}
							>
								{count}
							</span>
						</span>
						<ChevronDown
							className="w-4 h-4 transition-transform duration-200"
							style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
							strokeWidth={2}
						/>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>{children}</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

function ItemList({ items }: { items: string[] }) {
	return (
		<ul>
			{items.map((item) => (
				<li
					key={item}
					className="px-4 py-2.5 text-sm leading-relaxed break-words"
					style={{
						color: "var(--text-2)",
						borderTop: "1px solid var(--border)",
					}}
				>
					{item}
				</li>
			))}
		</ul>
	);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function PeerCardViewer({ lines }: Props) {
	if (!lines || lines.length === 0) {
		return (
			<p className="text-sm" style={{ color: "var(--text-4)" }}>
				No card set.
			</p>
		);
	}

	const { titlePairs, facts, capsGroups } = parse(lines);

	return (
		<div className="space-y-2">
			<MetadataCard pairs={titlePairs} />

			{facts.length > 0 && (
				<CollapsibleSection label="Facts" count={facts.length} style={FACTS_STYLE}>
					<ItemList items={facts} />
				</CollapsibleSection>
			)}

			{capsGroups.map((g) => {
				const p = PALETTE[hashPalette(g.key)];
				return (
					<CollapsibleSection
						key={g.key}
						label={toLabel(g.key)}
						count={g.items.length}
						style={{ bg: p.bg, text: p.text, border: p.border }}
					>
						<ItemList items={g.items} />
					</CollapsibleSection>
				);
			})}
		</div>
	);
}
