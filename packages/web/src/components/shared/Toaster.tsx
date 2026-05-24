import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { dismissToast, getToasts, subscribeToasts, type Toast } from "@/lib/toast";

const ICONS = {
	success: CheckCircle2,
	error: AlertCircle,
	info: Info,
} as const;

const COLORS: Record<Toast["kind"], { fg: string; bg: string; border: string }> = {
	success: {
		fg: "#34d399",
		bg: "rgba(52,211,153,0.08)",
		border: "rgba(52,211,153,0.25)",
	},
	error: {
		fg: "#f87171",
		bg: "rgba(239,68,68,0.08)",
		border: "rgba(239,68,68,0.25)",
	},
	info: {
		fg: "var(--accent-text)",
		bg: "var(--accent-dim)",
		border: "var(--accent-border)",
	},
};

export function Toaster() {
	const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

	return (
		<div
			aria-live="polite"
			aria-atomic="true"
			className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
			style={{ maxWidth: "min(22rem, calc(100vw - 2rem))" }}
		>
			<AnimatePresence initial={false}>
				{toasts.map((t) => {
					const Icon = ICONS[t.kind];
					const palette = COLORS[t.kind];
					return (
						<motion.div
							key={t.id}
							layout
							initial={{ opacity: 0, x: 24, scale: 0.96 }}
							animate={{ opacity: 1, x: 0, scale: 1 }}
							exit={{ opacity: 0, x: 24, scale: 0.96 }}
							transition={{ type: "spring", stiffness: 320, damping: 26 }}
							className="pointer-events-auto flex items-start gap-2 rounded-xl px-3 py-2.5 shadow-lg"
							style={{
								background: palette.bg,
								border: `1px solid ${palette.border}`,
								backdropFilter: "blur(8px)",
							}}
						>
							<Icon
								className="w-4 h-4 mt-0.5 shrink-0"
								style={{ color: palette.fg }}
								strokeWidth={2}
							/>
							<div className="flex-1 text-xs leading-relaxed" style={{ color: "var(--text-1)" }}>
								{t.message}
							</div>
							<button
								type="button"
								onClick={() => dismissToast(t.id)}
								className="shrink-0 rounded p-0.5 transition-colors"
								style={{ color: "var(--text-4)" }}
								aria-label="Dismiss"
							>
								<X className="w-3 h-3" strokeWidth={2} />
							</button>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
