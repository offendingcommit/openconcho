import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Body, Caption } from "@/components/ui/typography";
import { useHealthStatus } from "@/hooks/useHealthStatus";
import { useInstances } from "@/hooks/useInstances";
import { COLOR } from "@/lib/constants";

const TITLE = "Authentication token required";
const BODY = "This Honcho instance requires an authentication token, and none is configured.";
const ACTION = "Add token in Settings";

export function MissingTokenAlert() {
	const { active } = useInstances();
	const { data: health } = useHealthStatus();
	const tokenMissing = !active?.token?.trim();

	if (!tokenMissing || health?.status !== "auth-required") return null;

	return (
		<div
			role="alert"
			className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
			style={{
				background: COLOR.warningDim,
				borderBottom: `1px solid ${COLOR.warningBorder}`,
			}}
		>
			<div className="flex items-start gap-2 min-w-0 flex-1">
				<AlertTriangle
					className="w-4 h-4 shrink-0 mt-0.5"
					style={{ color: COLOR.warning }}
					strokeWidth={2}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<Body className="font-medium" style={{ color: COLOR.warning }}>
						{TITLE}
					</Body>
					<Caption as="p" className="mt-0.5">
						{BODY}
					</Caption>
				</div>
			</div>
			<Link
				to="/settings"
				className="text-sm font-medium px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-[var(--bg)]"
				style={{
					color: COLOR.warning,
					border: `1px solid ${COLOR.warningBorder}`,
					background: "var(--surface)",
				}}
			>
				{ACTION}
			</Link>
		</div>
	);
}
