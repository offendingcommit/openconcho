import { ArrowDown, ArrowUp } from "lucide-react";
import { COLOR } from "@/lib/constants";

export type SortDir = "asc" | "desc";

export interface SortOption {
	value: string;
	label: string;
}

interface SortControlProps {
	options: SortOption[];
	field: string;
	dir: SortDir;
	onChange: (field: string, dir: SortDir) => void;
}

export function SortControl({ options, field, dir, onChange }: SortControlProps) {
	function handleClick(value: string) {
		if (value === field) {
			// Toggle direction on active option
			onChange(value, dir === "desc" ? "asc" : "desc");
		} else {
			// New field always starts desc (most-recent-first convention)
			onChange(value, "desc");
		}
	}

	return (
		<div className="flex items-center gap-1.5">
			<span className="text-xs" style={{ color: "var(--text-4)" }}>
				Sort:
			</span>
			<div className="flex items-center gap-0.5">
				{options.map((opt) => {
					const active = opt.value === field;
					return (
						<button
							key={opt.value}
							type="button"
							onClick={() => handleClick(opt.value)}
							className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium transition-all"
							style={{
								background: active ? COLOR.accentSubtle : "transparent",
								color: active ? "var(--accent-text)" : "var(--text-3)",
								border: `1px solid ${active ? COLOR.accentBorder : "transparent"}`,
							}}
						>
							{opt.label}
							{active &&
								(dir === "desc" ? (
									<ArrowDown className="w-2.5 h-2.5" strokeWidth={2.5} />
								) : (
									<ArrowUp className="w-2.5 h-2.5" strokeWidth={2.5} />
								))}
						</button>
					);
				})}
			</div>
		</div>
	);
}
