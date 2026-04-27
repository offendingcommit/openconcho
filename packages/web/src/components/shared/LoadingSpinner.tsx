import { motion } from "framer-motion";
import { COLOR } from "@/lib/constants";

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizes = { sm: 16, md: 24, lg: 40 };

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
	const s = sizes[size];
	return (
		<motion.div
			className={className}
			animate={{ rotate: 360 }}
			transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
			style={{
				width: s,
				height: s,
				borderRadius: "50%",
				border: `2px solid ${COLOR.accentSpinnerTrack}`,
				borderTopColor: COLOR.accent,
			}}
		/>
	);
}

export function PageLoader() {
	return (
		<div className="flex flex-col items-center justify-center h-48 gap-3">
			<LoadingSpinner size="lg" />
			<motion.div
				className="h-px w-24"
				style={{ background: `linear-gradient(90deg, transparent, ${COLOR.accent}, transparent)` }}
				animate={{ opacity: [0.4, 1, 0.4] }}
				transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
			/>
		</div>
	);
}
