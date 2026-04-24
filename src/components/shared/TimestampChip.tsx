import { cn } from "@/lib/utils";
import { DateTime } from "luxon";

interface Props {
	/** ISO-like string: "2026-04-24 18:18:48" or any Luxon-parseable string */
	value: string;
	className?: string;
}

function parseTimestamp(value: string): DateTime {
	// Try bracket format first: "2026-04-24 18:18:48"
	const dt = DateTime.fromFormat(value, "yyyy-MM-dd HH:mm:ss");
	if (dt.isValid) return dt;
	// Fall back to ISO
	return DateTime.fromISO(value);
}

function formatDisplay(dt: DateTime): string {
	const now = DateTime.now();
	const diffMs = Math.abs(now.diff(dt, "milliseconds").milliseconds);

	// Same calendar day → show time only
	if (dt.hasSame(now, "day")) return dt.toFormat("HH:mm:ss");
	// Within the past year → month + day + time
	if (diffMs < 365 * 24 * 3600 * 1000) return dt.toFormat("MMM d HH:mm");
	// Older → full date
	return dt.toFormat("yyyy-MM-dd HH:mm");
}

export function TimestampChip({ value, className }: Props) {
	const dt = parseTimestamp(value);
	if (!dt.isValid) {
		return (
			<span className={cn("font-mono text-xs", className)} style={{ color: "var(--text-4)" }}>
				{value}
			</span>
		);
	}

	const display = formatDisplay(dt);
	const full = dt.toFormat("yyyy-MM-dd HH:mm:ss ZZZZ");
	const relative = dt.toRelative() ?? "";

	return (
		<time
			dateTime={dt.toISO() ?? value}
			title={`${full} · ${relative}`}
			className={cn(
				"inline-flex items-center shrink-0 font-mono text-xs px-1.5 py-0.5 rounded",
				"select-none cursor-default",
				className,
			)}
			style={{
				background: "rgba(99,102,241,0.1)",
				color: "var(--accent-text)",
				border: "1px solid rgba(99,102,241,0.2)",
			}}
		>
			{display}
		</time>
	);
}
