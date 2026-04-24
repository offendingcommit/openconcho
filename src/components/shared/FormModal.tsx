import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface FormModalProps {
	open: boolean;
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	maxWidth?: string;
}

export function FormModal({
	open,
	title,
	onClose,
	children,
	maxWidth = "max-w-md",
}: FormModalProps) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape" && open) onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose]);

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
					onClick={(e) => e.target === e.currentTarget && onClose()}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 12 }}
						transition={{ type: "spring", stiffness: 300, damping: 28 }}
						className={`w-full ${maxWidth} rounded-2xl relative`}
						style={{
							background: "var(--bg-2)",
							border: "1px solid var(--border-2)",
							boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
						}}
					>
						<div
							className="flex items-center justify-between px-5 py-4"
							style={{ borderBottom: "1px solid var(--border)" }}
						>
							<h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
								{title}
							</h3>
							<button
								onClick={onClose}
								className="p-1 rounded-lg transition-colors"
								style={{ color: "var(--text-4)" }}
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="p-5">{children}</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
