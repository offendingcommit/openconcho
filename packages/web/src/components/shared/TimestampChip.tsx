import { DateTime } from "luxon";
import { COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
	/** ISO-like string: "2026-04-24 18:18:48" or any Luxon-parseable string */
	value: string;
	className?: string;
}

function parseTimestamp(value: string): DateTime {
	// Honcho stores timestamps as UTC without timezone suffix — parse as UTC, display in local
	const dt = DateTime.fromFormat(value, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });
	if (dt.isValid) return dt.toLocal();
	// Fall back to ISO (may include timezone info)
	return DateTime.fromISO(value);
}

function formatDisplay(dt: DateTime): { label: string; isRelative: boolean } {
	const now = DateTime.now();
	const diffMs = Math.abs(now.diff(dt, "milliseconds").milliseconds);

	// Today → relative time ("2 hours ago", "just now")
	if (dt.hasSame(now, "day")) return { label: dt.toRelative() ?? "just now", isRelative: true };
	// Within the past year → month + day + time
	if (diffMs < 365 * 24 * 3600 * 1000)
		return { label: dt.toFormat("MMM d HH:mm"), isRelative: false };
	// Older → full date
	return { label: dt.toFormat("yyyy-MM-dd HH:mm"), isRelative: false };
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

	const { label: display, isRelative } = formatDisplay(dt);
	const full = dt.toFormat("yyyy-MM-dd HH:mm:ss ZZZZ");
	const relative = dt.toRelative() ?? "";

	return (
		<time
			dateTime={dt.toISO() ?? value}
			title={isRelative ? full : `${full} · ${relative}`}
			className={cn(
				"inline-flex items-center shrink-0 text-xs px-1.5 py-0.5 rounded",
				"select-none cursor-default",
				isRelative ? "font-sans" : "font-mono",
				className,
			)}
			style={{
				background: COLOR.accentSubtle,
				color: "var(--accent-text)",
				border: `1px solid ${COLOR.accentBorder}`,
			}}
		>
			{display}
		</time>
	);
}
