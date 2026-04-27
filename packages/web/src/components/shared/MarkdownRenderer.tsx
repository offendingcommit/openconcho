import { Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { TimestampChip } from "@/components/shared/TimestampChip";
import { COLOR } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type Confidence = "high" | "medium" | "low";

interface PatternBlock {
	confidence: Confidence;
	description: string;
	type: string;
	sources: string[];
}

interface ContradictionBlock {
	description: string;
	conflictingStatements: string[];
}

interface ContentSection {
	heading: string | null;
	rawBody: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMESTAMP_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s*(.*)/s;

const CONFIDENCE_STYLE: Record<Confidence, { bg: string; text: string; border: string }> = {
	high: { bg: COLOR.destructiveDim, text: COLOR.destructive, border: COLOR.destructiveBorder },
	medium: { bg: COLOR.warningDim, text: COLOR.warning, border: COLOR.warningBorder },
	low: { bg: COLOR.successDim, text: COLOR.success, border: COLOR.successBorder },
};

const CONFIDENCE_ORDER: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

// 10+ alphanumeric/_/- chars in brackets that are NOT a timestamp
const CITATION_RE = /\[([A-Za-z0-9_-]{10,})\]/g;

// ─── Preprocessor ─────────────────────────────────────────────────────────────

function preprocessContent(content: string): string {
	return content
		.replace(/^ {3}/gm, "")
		.replace(/^(- .+)\n(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\])/gm, "$1\n\n$2");
}

// ─── Section splitter ─────────────────────────────────────────────────────────

function splitIntoSections(content: string): ContentSection[] {
	const result: ContentSection[] = [];
	const parts = content.split(/^(## .+)$/m);

	if (parts[0].trim()) {
		result.push({ heading: null, rawBody: parts[0] });
	}

	for (let i = 1; i < parts.length; i += 2) {
		result.push({
			heading: parts[i].replace(/^## /, "").trim(),
			rawBody: parts[i + 1] ?? "",
		});
	}

	return result;
}

// ─── Block parsers ────────────────────────────────────────────────────────────

function parsePatternBlocks(sectionBody: string): PatternBlock[] {
	const blocks = sectionBody.split(/\n\n+/);
	const result: PatternBlock[] = [];

	for (const block of blocks) {
		const lines = block.split("\n");
		const firstLine = (lines[0] ?? "").trim();
		const patternMatch = /\*\*Pattern\*\* \[(high|medium|low)\]: (.+)/i.exec(firstLine);
		if (!patternMatch) continue;

		const confidence = patternMatch[1].toLowerCase() as Confidence;
		const description = patternMatch[2].trim();
		let type = "";
		const sources: string[] = [];
		let inSources = false;

		for (const line of lines.slice(1)) {
			const t = line.trim();
			if (!t) continue;
			const typeMatch = /\*\*Type\*\*: (.+)/.exec(t);
			if (typeMatch) {
				type = typeMatch[1].trim();
				continue;
			}
			if (/\*\*Sources\*\*:/.test(t)) {
				inSources = true;
				continue;
			}
			if (inSources && t.startsWith("- ")) {
				sources.push(t.slice(2).trim());
			}
		}

		result.push({ confidence, description, type, sources });
	}

	return result.sort((a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence]);
}

function parseContradictionBlocks(sectionBody: string): ContradictionBlock[] {
	const blocks = sectionBody.split(/\n\n+/);
	const result: ContradictionBlock[] = [];

	for (const block of blocks) {
		const lines = block.split("\n");
		const firstLine = (lines[0] ?? "").trim();
		const descMatch = /\*\*CONTRADICTION\*\*: (.+)/i.exec(firstLine);
		if (!descMatch) continue;

		const description = descMatch[1].trim();
		const conflictingStatements: string[] = [];
		let inStatements = false;

		for (const line of lines.slice(1)) {
			const t = line.trim();
			if (!t) continue;
			if (/\*\*Conflicting statements?\*\*:/.test(t)) {
				inStatements = true;
				continue;
			}
			if (inStatements && t.startsWith("- ")) {
				conflictingStatements.push(t.slice(2).trim());
			}
		}

		result.push({ description, conflictingStatements });
	}

	return result;
}

// ─── Inline citation renderer ─────────────────────────────────────────────────

function renderWithCitations(text: string, workspaceId?: string): React.ReactNode[] {
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	CITATION_RE.lastIndex = 0;
	let match = CITATION_RE.exec(text);

	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		const id = match[1];
		const label = `${id.slice(0, 8)}…`;
		const chipStyle = {
			background: COLOR.accentDim,
			color: COLOR.accentText,
			border: `1px solid ${COLOR.accentBorder}`,
		};

		if (workspaceId) {
			parts.push(
				<Link
					key={`${id}-${match.index}`}
					to="/workspaces/$workspaceId/sessions/$sessionId"
					params={{ workspaceId, sessionId: id } as never}
					className="font-mono text-xs px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
					style={chipStyle}
				>
					{label}
				</Link>,
			);
		} else {
			parts.push(
				<span
					key={`${id}-${match.index}`}
					className="font-mono text-xs px-1.5 py-0.5 rounded"
					style={chipStyle}
				>
					{label}
				</span>,
			);
		}

		lastIndex = match.index + match[0].length;
		match = CITATION_RE.exec(text);
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts;
}

// ─── Section renderers ────────────────────────────────────────────────────────

function PatternCard({ block }: { block: PatternBlock }) {
	const cs = CONFIDENCE_STYLE[block.confidence];
	return (
		<div
			className="rounded-lg p-4 mb-3"
			style={{ background: COLOR.cardBaseBg, border: `1px solid ${COLOR.cardBaseBorder}` }}
		>
			<div className="flex items-center gap-2 mb-2 flex-wrap">
				<span
					className="text-xs font-mono px-2 py-0.5 rounded-full uppercase font-semibold tracking-wide"
					style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}
				>
					{block.confidence}
				</span>
				{block.type && (
					<span
						className="text-xs font-mono px-2 py-0.5 rounded"
						style={{
							background: COLOR.accentSubtle,
							color: COLOR.accentText,
							border: `1px solid ${COLOR.accentBorder}`,
						}}
					>
						{block.type}
					</span>
				)}
			</div>
			<p className="text-sm leading-relaxed mb-0" style={{ color: "var(--text-2)" }}>
				{block.description}
			</p>
			{block.sources.length > 0 && (
				<div
					className="mt-3 pt-3 space-y-1"
					style={{ borderTop: `1px solid ${COLOR.cardBaseBorder}` }}
				>
					<p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-3)" }}>
						Sources
					</p>
					{block.sources.map((s) => {
						const isOverflow = /^\.\.\. and \d+ more$/.test(s);
						return (
							<div key={s} className="flex items-start gap-1.5">
								{!isOverflow && (
									<span className="mt-1 shrink-0 text-xs" style={{ color: COLOR.accent }}>
										•
									</span>
								)}
								<span
									className={isOverflow ? "text-xs italic pl-3" : "text-xs leading-relaxed"}
									style={{
										color: isOverflow ? "var(--text-4)" : "var(--text-3)",
									}}
								>
									{s}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function ContradictionCard({
	block,
	workspaceId,
}: {
	block: ContradictionBlock;
	workspaceId?: string;
}) {
	return (
		<div
			className="rounded-lg p-4 mb-3"
			style={{
				background: COLOR.destructiveDim,
				border: `1px solid ${COLOR.destructiveBorder}`,
			}}
		>
			<div className="flex items-center gap-2 mb-2">
				<span
					className="text-xs font-mono px-2 py-0.5 rounded-full uppercase font-semibold tracking-wide"
					style={{
						background: "rgba(239,68,68,0.12)",
						color: COLOR.destructive,
						border: `1px solid ${COLOR.destructiveBorder}`,
					}}
				>
					Contradiction
				</span>
			</div>
			<p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
				{renderWithCitations(block.description, workspaceId)}
			</p>
			{block.conflictingStatements.length > 0 && (
				<div
					className="mt-3 pt-3 space-y-2"
					style={{ borderTop: `1px solid ${COLOR.destructiveBorder}` }}
				>
					<p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-3)" }}>
						Conflicting statements
					</p>
					{block.conflictingStatements.map((s, i) => (
						<div
							key={s}
							className="flex items-start gap-2 rounded px-3 py-2"
							style={{
								background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(248,113,113,0.04)",
								border: `1px solid ${COLOR.destructiveBorder}`,
							}}
						>
							<span
								className="text-xs font-mono shrink-0 mt-0.5"
								style={{ color: COLOR.destructiveMuted }}
							>
								{i === 0 ? "A" : "B"}
							</span>
							<span className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
								{s}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Standard markdown pipeline ───────────────────────────────────────────────

function flattenChildren(children: React.ReactNode): string {
	if (typeof children === "string") return children;
	if (Array.isArray(children)) return children.map(flattenChildren).join("");
	if (children && typeof children === "object" && "props" in (children as object)) {
		return flattenChildren((children as { props: { children?: React.ReactNode } }).props.children);
	}
	return "";
}

function Paragraph({ children }: { children?: React.ReactNode }) {
	const text = flattenChildren(children);
	const lines = text.split("\n").filter(Boolean);

	// All lines are timestamps → sorted chip list
	if (lines.length > 0 && lines.every((l) => TIMESTAMP_LINE_RE.test(l))) {
		const sorted = [...lines].sort((a, b) => {
			const ta = DateTime.fromFormat(TIMESTAMP_LINE_RE.exec(a)?.[1] ?? "", "yyyy-MM-dd HH:mm:ss", {
				zone: "utc",
			});
			const tb = DateTime.fromFormat(TIMESTAMP_LINE_RE.exec(b)?.[1] ?? "", "yyyy-MM-dd HH:mm:ss", {
				zone: "utc",
			});
			return tb.toMillis() - ta.toMillis();
		});
		return (
			<div className="space-y-0.5 my-2">
				{sorted.map((line) => {
					const m = TIMESTAMP_LINE_RE.exec(line);
					return (
						<div
							key={line}
							className="flex items-start gap-3 py-1 px-1 rounded-sm"
							style={{ borderBottom: "1px solid var(--border)" }}
						>
							<TimestampChip value={m?.[1] ?? ""} className="mt-0.5" />
							<span
								className="text-sm leading-relaxed flex-1 min-w-0"
								style={{ color: "var(--text-2)" }}
							>
								{m?.[2]}
							</span>
						</div>
					);
				})}
			</div>
		);
	}

	// First line is timestamp + trailing label(s) → deductive entry header
	const firstMatch = lines.length > 1 ? TIMESTAMP_LINE_RE.exec(lines[0]) : null;
	if (firstMatch) {
		return (
			<div className="mt-3 mb-1 pb-1" style={{ borderBottom: "1px solid var(--border)" }}>
				<div className="flex items-start gap-3">
					<TimestampChip value={firstMatch[1]} className="mt-0.5 shrink-0" />
					<span className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
						{firstMatch[2]}
					</span>
				</div>
				{lines.slice(1).map((l) => (
					<p key={l} className="text-xs mt-1 font-medium" style={{ color: "var(--text-3)" }}>
						{l}
					</p>
				))}
			</div>
		);
	}

	return (
		<p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
			{children}
		</p>
	);
}

const SECTION_H2_CLASS = "text-sm font-semibold mt-4 mb-3 pb-1 uppercase tracking-wider";
const SECTION_H2_STYLE = { color: "var(--accent-text)", borderBottom: "1px solid var(--border)" };

const COMPONENTS: Components = {
	h1: ({ children }) => (
		<h1
			className="text-base font-semibold mt-4 mb-2 pb-1"
			style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}
		>
			{children}
		</h1>
	),
	h2: ({ children }) => (
		<h2 className={SECTION_H2_CLASS} style={SECTION_H2_STYLE}>
			{children}
		</h2>
	),
	h3: ({ children }) => (
		<h3 className="text-sm font-medium mt-3 mb-1.5" style={{ color: "var(--text-1)" }}>
			{children}
		</h3>
	),
	p: Paragraph,
	ul: ({ children }) => (
		<ul className="text-sm space-y-1 mb-3 pl-4 list-disc" style={{ color: "var(--text-2)" }}>
			{children}
		</ul>
	),
	ol: ({ children }) => (
		<ol className="text-sm space-y-1 mb-3 pl-4 list-decimal" style={{ color: "var(--text-2)" }}>
			{children}
		</ol>
	),
	li: ({ children }) => <li className="leading-relaxed">{children}</li>,
	code: ({ children, className }) => {
		const isBlock = className?.includes("language-");
		if (isBlock) {
			return (
				<pre
					className="text-xs font-mono rounded-lg p-3 overflow-x-auto my-3"
					style={{
						background: "var(--bg-3)",
						border: "1px solid var(--border)",
						color: "var(--text-2)",
					}}
				>
					<code>{children}</code>
				</pre>
			);
		}
		return (
			<code
				className="text-xs font-mono px-1.5 py-0.5 rounded"
				style={{
					background: "var(--bg-3)",
					color: "var(--accent-text)",
					border: "1px solid var(--border)",
				}}
			>
				{children}
			</code>
		);
	},
	blockquote: ({ children }) => (
		<blockquote
			className="text-sm pl-3 my-3 italic"
			style={{ borderLeft: "3px solid var(--accent-border)", color: "var(--text-3)" }}
		>
			{children}
		</blockquote>
	),
	hr: () => (
		<hr style={{ border: "none", borderTop: "1px solid var(--border)" }} className="my-4" />
	),
	strong: ({ children }) => (
		<strong className="font-semibold" style={{ color: "var(--text-1)" }}>
			{children}
		</strong>
	),
};

// ─── Export ───────────────────────────────────────────────────────────────────

interface Props {
	content: string;
	workspaceId?: string;
}

export function MarkdownRenderer({ content, workspaceId }: Props) {
	const sections = splitIntoSections(content);

	return (
		<div>
			{sections.map((section) => {
				const sectionKey = `${section.heading ?? ""}-${section.rawBody.slice(0, 30)}`;
				if (section.heading === "Inductive Observations") {
					const blocks = parsePatternBlocks(section.rawBody);
					return (
						<div key={sectionKey}>
							<h2 className={SECTION_H2_CLASS} style={SECTION_H2_STYLE}>
								Inductive Observations
							</h2>
							{blocks.map((b) => (
								<PatternCard
									key={`${b.confidence}-${b.type}-${b.description.slice(0, 20)}`}
									block={b}
								/>
							))}
						</div>
					);
				}

				if (section.heading === "Contradictions") {
					const blocks = parseContradictionBlocks(section.rawBody);
					return (
						<div key={sectionKey}>
							<h2 className={SECTION_H2_CLASS} style={SECTION_H2_STYLE}>
								Contradictions
							</h2>
							{blocks.map((b) => (
								<ContradictionCard
									key={b.description.slice(0, 40)}
									block={b}
									workspaceId={workspaceId}
								/>
							))}
						</div>
					);
				}

				const sectionContent = section.heading
					? `## ${section.heading}\n${section.rawBody}`
					: section.rawBody;

				return (
					<ReactMarkdown key={sectionKey} remarkPlugins={[remarkGfm]} components={COMPONENTS}>
						{preprocessContent(sectionContent)}
					</ReactMarkdown>
				);
			})}
		</div>
	);
}
