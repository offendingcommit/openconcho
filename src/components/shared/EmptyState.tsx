import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className="flex flex-col items-center justify-center py-20 text-center"
		>
			{Icon && (
				<div
					className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
					style={{
						background: "rgba(99,102,241,0.08)",
						border: "1px solid rgba(99,102,241,0.15)",
					}}
				>
					<Icon className="w-5 h-5" style={{ color: "rgba(99,102,241,0.6)" }} strokeWidth={1.5} />
				</div>
			)}
			<p className="text-zinc-300 font-medium text-sm">{title}</p>
			{description && (
				<p className="text-zinc-600 text-xs mt-1.5 max-w-xs leading-relaxed">{description}</p>
			)}
			{action && <div className="mt-4">{action}</div>}
		</motion.div>
	);
}
