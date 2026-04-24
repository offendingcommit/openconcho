import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	danger?: boolean;
	loading?: boolean;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	onConfirm,
	onCancel,
	danger = true,
	loading = false,
}: ConfirmDialogProps) {
	const cancelRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (open) cancelRef.current?.focus();
	}, [open]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape" && open) onCancel();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onCancel]);

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
					onClick={(e) => e.target === e.currentTarget && onCancel()}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 8 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 8 }}
						transition={{ type: "spring", stiffness: 300, damping: 28 }}
						className="w-full max-w-sm rounded-2xl p-6 relative"
						style={{
							background: "var(--bg-2)",
							border: "1px solid var(--border-2)",
							boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
						}}
					>
						<button
							onClick={onCancel}
							className="absolute top-4 right-4 p-1 rounded-lg transition-colors"
							style={{ color: "var(--text-4)" }}
						>
							<X className="w-4 h-4" />
						</button>

						<div className="flex items-start gap-3 mb-4">
							{danger && (
								<div
									className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
									style={{ background: "rgba(239,68,68,0.1)" }}
								>
									<AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} strokeWidth={2} />
								</div>
							)}
							<div>
								<h3
									className="text-sm font-semibold mb-1"
									style={{ color: "var(--text-1)" }}
								>
									{title}
								</h3>
								<p className="text-sm" style={{ color: "var(--text-3)" }}>
									{description}
								</p>
							</div>
						</div>

						<div className="flex gap-2 justify-end mt-6">
							<button
								ref={cancelRef}
								onClick={onCancel}
								className="px-3 py-1.5 text-sm rounded-lg transition-colors"
								style={{
									background: "var(--surface)",
									border: "1px solid var(--border)",
									color: "var(--text-2)",
								}}
							>
								Cancel
							</button>
							<button
								onClick={onConfirm}
								disabled={loading}
								className="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
								style={
									danger
										? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }
										: { background: "var(--accent-dim)", color: "var(--accent-text)", border: "1px solid var(--accent-border)" }
								}
							>
								{loading ? "..." : confirmLabel}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
