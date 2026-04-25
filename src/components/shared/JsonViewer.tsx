interface JsonViewerProps {
	data: unknown;
	maxHeight?: string;
}

export function JsonViewer({ data, maxHeight = "200px" }: JsonViewerProps) {
	if (data === null || data === undefined) {
		return <span className="text-xs italic" style={{ color: "var(--text-4)" }}>empty</span>;
	}

	const isEmpty =
		typeof data === "object" && data !== null && Object.keys(data as object).length === 0;
	if (isEmpty) {
		return <span className="text-xs italic" style={{ color: "var(--text-4)" }}>&#123;&#125;</span>;
	}

	return (
		<pre
			className="text-xs rounded-xl p-3 overflow-auto font-mono"
			style={{
				maxHeight,
				background: "var(--bg)",
				border: "1px solid var(--border)",
				color: "var(--text-2)",
			}}
		>
			{JSON.stringify(data, null, 2)}
		</pre>
	);
}
