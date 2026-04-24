import { TimestampChip } from "@/components/shared/TimestampChip";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// [2026-04-24 18:18:48] rest of line
const TIMESTAMP_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s*(.*)/s;

function flattenChildren(children: React.ReactNode): string {
	if (typeof children === "string") return children;
	if (Array.isArray(children)) return children.map(flattenChildren).join("");
	if (children && typeof children === "object" && "props" in (children as object)) {
		return flattenChildren((children as { props: { children?: React.ReactNode } }).props.children);
	}
	return "";
}

/** Paragraph renderer: detects blocks of timestamp lines and renders them specially. */
function Paragraph({ children }: { children?: React.ReactNode }) {
	const text = flattenChildren(children);
	const lines = text.split("\n").filter(Boolean);

	// If every line in this paragraph matches the timestamp pattern, render as timestamp list
	if (lines.length > 0 && lines.every((l) => TIMESTAMP_LINE_RE.test(l))) {
		return (
			<div className="space-y-0.5 my-2">
				{lines.map((line, i) => {
					const m = TIMESTAMP_LINE_RE.exec(line)!;
					return (
						<div
							key={i}
							className="flex items-start gap-3 py-1 px-1 rounded-sm group"
							style={{ borderBottom: "1px solid var(--border)" }}
						>
							<TimestampChip value={m[1]} className="mt-0.5" />
							<span
								className="text-sm leading-relaxed flex-1 min-w-0"
								style={{ color: "var(--text-2)" }}
							>
								{m[2]}
							</span>
						</div>
					);
				})}
			</div>
		);
	}

	return (
		<p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
			{children}
		</p>
	);
}

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
		<h2
			className="text-sm font-semibold mt-4 mb-2 pb-1 uppercase tracking-wider"
			style={{ color: "var(--accent-text)", borderBottom: "1px solid var(--border)" }}
		>
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
			style={{
				borderLeft: "3px solid var(--accent-border)",
				color: "var(--text-3)",
			}}
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

interface Props {
	content: string;
}

export function MarkdownRenderer({ content }: Props) {
	return (
		<ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
			{content}
		</ReactMarkdown>
	);
}
