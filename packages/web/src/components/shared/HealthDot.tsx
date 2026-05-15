import { motion } from "framer-motion";
import type { HealthStatus } from "@/lib/config";
import { COLOR } from "@/lib/constants";

interface HealthDotProps {
	status: HealthStatus | undefined;
	message?: string;
	size?: number;
}

const COLORS: Record<HealthStatus, string> = {
	ok: COLOR.success,
	"auth-required": COLOR.warning,
	unreachable: COLOR.destructive,
	checking: COLOR.accentText,
};

const LABELS: Record<HealthStatus, string> = {
	ok: "Connected",
	"auth-required": "Auth required",
	unreachable: "Unreachable",
	checking: "Checking...",
};

export function HealthDot({ status, message, size = 8 }: HealthDotProps) {
	const color = status ? COLORS[status] : "var(--text-4)";
	const label = status ? LABELS[status] : "Unknown";
	const title = message ? `${label} — ${message}` : label;
	const pulsing = status === "checking";

	return (
		<motion.span
			aria-label={`Connection status: ${label}`}
			title={title}
			animate={pulsing ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
			transition={pulsing ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY } : undefined}
			style={{
				display: "inline-block",
				width: size,
				height: size,
				borderRadius: "50%",
				background: color,
				boxShadow: status === "ok" ? `0 0 6px ${color}80` : undefined,
				flexShrink: 0,
			}}
		/>
	);
}
