import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Body, Caption } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";

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
						background: COLOR.accentSubtle,
						border: `1px solid ${COLOR.accentBorderStrong}`,
					}}
				>
					<Icon className="w-5 h-5" style={{ color: COLOR.accentMuted }} strokeWidth={1.5} />
				</div>
			)}
			<Body className="font-medium">{title}</Body>
			{description && <Caption className="mt-1.5 max-w-xs leading-relaxed">{description}</Caption>}
			{action && <div className="mt-4">{action}</div>}
		</motion.div>
	);
}
