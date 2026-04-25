import { motion } from "framer-motion";

interface CardProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
	return (
		<motion.div
			onClick={onClick}
			whileHover={onClick ? { scale: 1.005, y: -1 } : undefined}
			whileTap={onClick ? { scale: 0.998 } : undefined}
			className={className}
			style={{
				background: "rgba(255,255,255,0.02)",
				border: "1px solid rgba(255,255,255,0.06)",
				borderRadius: 12,
				padding: 16,
				cursor: onClick ? "pointer" : "default",
				transition: "border-color 0.2s",
			}}
		>
			{children}
		</motion.div>
	);
}
