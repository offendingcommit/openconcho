// Semantic color tokens for inline styles.
// CSS variables (var(--text-1) etc.) handle theme-aware colors.
// These constants are for fixed semantic states that don't invert with theme.

export const COLOR = {
	// Status
	success: "#34d399",
	successDim: "rgba(52,211,153,0.08)",
	successBorder: "rgba(52,211,153,0.2)",

	warning: "#f59e0b",
	warningDim: "rgba(245,158,11,0.08)",
	warningBorder: "rgba(245,158,11,0.2)",

	destructive: "#f87171",
	destructiveDim: "rgba(239,68,68,0.08)",
	destructiveBorder: "rgba(239,68,68,0.2)",

	// Accent (indigo — matches --accent CSS var)
	accent: "#6366f1",
	accentText: "#818cf8",
	accentSoft: "#c7d2fe",
	accentDim: "rgba(99,102,241,0.08)",
	accentDimHover: "rgba(99,102,241,0.06)",
	accentSubtle: "rgba(99,102,241,0.1)",
	accentBorder: "rgba(99,102,241,0.2)",
	accentBorderStrong: "rgba(99,102,241,0.15)",
} as const;
