import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader, CheckCircle, AlertCircle, Lock, LockOpen } from "lucide-react";
import {
	configSchema,
	loadConfig,
	saveConfig,
	checkConnection,
	type Config,
	type HealthStatus,
} from "@/lib/config";

interface SettingsFormProps {
	onSaved?: () => void;
}

const statusConfig = {
	ok: { icon: CheckCircle, color: "#34d399", label: "Connected" },
	"auth-required": { icon: AlertCircle, color: "#f59e0b", label: "Auth required" },
	unreachable: { icon: WifiOff, color: "#f87171", label: "Unreachable" },
	checking: { icon: Loader, color: "#818cf8", label: "Checking..." },
};

export function SettingsForm({ onSaved }: SettingsFormProps) {
	const existing = loadConfig();
	const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "http://localhost:8000");
	const [token, setToken] = useState(existing?.token ?? "");
	const [errors, setErrors] = useState<Partial<Record<keyof Config, string>>>({});
	const [saved, setSaved] = useState(false);
	const [health, setHealth] = useState<{ status: HealthStatus; message: string } | null>(null);
	const [checking, setChecking] = useState(false);

	async function handleTest() {
		setChecking(true);
		setHealth({ status: "checking", message: "Connecting..." });
		const result = await checkConnection(baseUrl, token || undefined);
		setHealth(result);
		setChecking(false);

		// Auto-show token field if auth is required
		if (result.status === "auth-required" && !token) {
			document.getElementById("honcho-token")?.focus();
		}
	}

	function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const result = configSchema.safeParse({ baseUrl, token });
		if (!result.success) {
			const fieldErrors: typeof errors = {};
			for (const issue of result.error.issues) {
				const key = issue.path[0] as keyof Config;
				fieldErrors[key] = issue.message;
			}
			setErrors(fieldErrors);
			return;
		}
		setErrors({});
		saveConfig(result.data);
		setSaved(true);
		setTimeout(() => {
			setSaved(false);
			onSaved?.();
		}, 600);
	}

	const StatusIcon = health ? statusConfig[health.status].icon : null;

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-2xl p-6 space-y-5"
			style={{
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
			}}
		>
			{/* Base URL */}
			<div>
				<label
					className="block text-sm font-medium mb-1.5"
					style={{ color: "var(--text-1)" }}
				>
					Honcho Base URL
				</label>
				<div className="flex gap-2">
					<input
						type="url"
						value={baseUrl}
						onChange={(e) => { setBaseUrl(e.target.value); setHealth(null); }}
						placeholder="http://localhost:8000"
						className="flex-1 px-3 py-2 text-sm font-mono rounded-xl outline-none transition-all"
						style={{
							background: "var(--surface)",
							border: "1px solid var(--border-2)",
							color: "var(--text-1)",
						}}
						onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
						onBlur={(e) => { e.target.style.borderColor = "var(--border-2)"; }}
					/>
					<button
						type="button"
						onClick={handleTest}
						disabled={checking || !baseUrl}
						className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
						style={{
							background: "var(--accent-dim)",
							border: "1px solid var(--accent-border)",
							color: "var(--accent-text)",
						}}
					>
						{checking ? (
							<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
								<Loader className="w-4 h-4" strokeWidth={1.5} />
							</motion.div>
						) : (
							<Wifi className="w-4 h-4" strokeWidth={1.5} />
						)}
						<span className="hidden sm:block">Test</span>
					</button>
				</div>
				{errors.baseUrl && (
					<p className="text-xs mt-1" style={{ color: "#f87171" }}>{errors.baseUrl}</p>
				)}
				<p className="text-xs mt-1.5" style={{ color: "var(--text-3)" }}>
					URL of your self-hosted Honcho instance
				</p>
			</div>

			{/* Health status */}
			<AnimatePresence>
				{health && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden"
					>
						<div
							className="rounded-xl px-4 py-3 flex items-center gap-2.5"
							style={{
								background: "var(--surface)",
								border: `1px solid ${statusConfig[health.status].color}33`,
							}}
						>
							{StatusIcon && (
								<StatusIcon
									className="w-4 h-4 shrink-0"
									style={{ color: statusConfig[health.status].color }}
									strokeWidth={1.5}
								/>
							)}
							<div>
								<p className="text-sm font-medium" style={{ color: statusConfig[health.status].color }}>
									{statusConfig[health.status].label}
								</p>
								<p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
									{health.message}
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Token */}
			<div>
				<label
					htmlFor="honcho-token"
					className="flex items-center gap-1.5 text-sm font-medium mb-1.5"
					style={{ color: "var(--text-1)" }}
				>
					{token ? (
						<Lock className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					) : (
						<LockOpen className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} strokeWidth={1.5} />
					)}
					API Token
					<span
						className="ml-1 text-xs font-normal px-1.5 py-0.5 rounded-full"
						style={{
							background: "var(--surface)",
							border: "1px solid var(--border)",
							color: "var(--text-3)",
						}}
					>
						optional
					</span>
				</label>
				<textarea
					id="honcho-token"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					rows={2}
					placeholder="eyJ... (required only if your instance has auth enabled)"
					className="w-full px-3 py-2.5 text-sm rounded-xl font-mono resize-none outline-none transition-all"
					style={{
						background: "var(--surface)",
						border: "1px solid var(--border-2)",
						color: "var(--text-1)",
					}}
					onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
					onBlur={(e) => { e.target.style.borderColor = "var(--border-2)"; }}
				/>
				{health?.status === "auth-required" && !token && (
					<motion.p
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-xs mt-1"
						style={{ color: "#f59e0b" }}
					>
						This instance requires an API token to proceed
					</motion.p>
				)}
			</div>

			<button
				type="submit"
				className="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
				style={{
					background: saved ? "#059669" : "var(--accent)",
					color: "#fff",
				}}
			>
				{saved ? "✓ Saved" : "Save Connection"}
			</button>
		</form>
	);
}
