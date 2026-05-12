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
	accent: "var(--accent)",
	accentText: "var(--accent-text)",
	accentSoft: "var(--accent-soft)",
	accentDim: "var(--accent-dim)",
	accentDimHover: "var(--accent-dim-hover)",
	accentSubtle: "var(--accent-subtle)",
	accentMuted: "var(--accent-muted)",
	accentGlow: "var(--accent-glow)",
	accentBorder: "var(--accent-border)",
	accentBorderStrong: "var(--accent-border-strong)",
	accentSpinnerTrack: "var(--accent-spinner-track)",

	// Neutral dim (slate-300 at opacity)
	dimText: "var(--dim-text)",
	dimIcon: "var(--dim-icon)",

	// Error detail text
	destructiveMuted: "rgba(248,113,113,0.6)",
	destructiveBorderStrong: "rgba(239,68,68,0.25)",

	// Framer-motion hover card base state (inline only — CSS vars can't be animated)
	cardBaseBg: "var(--card-base-bg)",
	cardBaseBorder: "var(--card-base-border)",
} as const;
