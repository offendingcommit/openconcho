import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { InstancesManager } from "@/components/settings/InstancesManager";
import { useInstances } from "@/hooks/useInstances";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();
	const { instances } = useInstances();
	const isFirstRun = instances.length === 0;

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
					<img
						src="/favicon.svg"
						alt="OpenConcho"
						className="w-14 h-14 rounded-2xl mx-auto mb-4"
						style={{ boxShadow: "0 0 32px rgba(99,102,241,0.35)" }}
					/>
					<h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
						OpenConcho
					</h1>
					<p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
						{isFirstRun
							? "Connect to your self-hosted Honcho instance"
							: "Manage your Honcho connections"}
					</p>
				</div>
				<InstancesManager onActivated={() => navigate({ to: "/" as never })} />
				<p className="text-xs text-center mt-4" style={{ color: "var(--text-4)" }}>
					Connection details are stored locally on this device only
				</p>
			</motion.div>
		</div>
	);
}
