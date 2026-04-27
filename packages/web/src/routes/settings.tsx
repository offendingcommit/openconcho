import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();

	return (
		<div
			className="flex-1 flex items-center justify-center p-4 overflow-auto"
			style={{ background: "var(--bg)" }}
		>
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 260, damping: 24 }}
				className="w-full max-w-md"
			>
				<div className="mb-8 text-center">
					<div
						className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
						style={{
							background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
							boxShadow: "0 0 32px rgba(99,102,241,0.35)",
						}}
					>
						<Brain className="w-7 h-7 text-white" strokeWidth={2} />
					</div>
					<h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
						Honcho UI
					</h1>
					<p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
						Connect to your self-hosted Honcho instance
					</p>
				</div>
				<SettingsForm onSaved={() => navigate({ to: "/" as never })} />
				<p className="text-xs text-center mt-4" style={{ color: "var(--text-4)" }}>
					Connection details are stored locally on this device only
				</p>
			</motion.div>
		</div>
	);
}
