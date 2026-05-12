interface BadgeProps {
	children: React.ReactNode;
	variant?: "default" | "green" | "yellow" | "red" | "blue";
}

const variantStyles: Record<string, React.CSSProperties> = {
	default: {
		background: "var(--surface)",
		color: "var(--text-2)",
		border: "1px solid var(--border)",
	},
	green: {
		background: "rgba(52,211,153,0.08)",
		color: "#34d399",
		border: "1px solid rgba(52,211,153,0.2)",
	},
	yellow: {
		background: "rgba(245,158,11,0.08)",
		color: "#f59e0b",
		border: "1px solid rgba(245,158,11,0.2)",
	},
	red: {
		background: "rgba(239,68,68,0.08)",
		color: "#f87171",
		border: "1px solid rgba(239,68,68,0.2)",
	},
	blue: {
		background: "var(--accent-subtle)",
		color: "var(--accent-text)",
		border: "1px solid var(--accent-border)",
	},
};

export function Badge({ children, variant = "default" }: BadgeProps) {
	return (
		<span
			className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono"
			style={variantStyles[variant]}
		>
			{children}
		</span>
	);
}
