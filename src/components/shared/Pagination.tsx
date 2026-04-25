interface PaginationProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center gap-2 mt-6">
			<button
				onClick={() => onPageChange(page - 1)}
				disabled={page <= 1}
				className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-30 transition-colors"
				style={{
					background: "var(--surface)",
					border: "1px solid var(--border)",
					color: "var(--text-2)",
				}}
			>
				Previous
			</button>
			<span className="text-xs font-mono px-2" style={{ color: "var(--text-3)" }}>
				{page} / {totalPages}
			</span>
			<button
				onClick={() => onPageChange(page + 1)}
				disabled={page >= totalPages}
				className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-30 transition-colors"
				style={{
					background: "var(--surface)",
					border: "1px solid var(--border)",
					color: "var(--text-2)",
				}}
			>
				Next
			</button>
		</div>
	);
}
