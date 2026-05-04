import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader, Lock, LockOpen, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Muted } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import { checkConnection, type HealthStatus, type Instance, instanceSchema } from "@/lib/config";
import { COLOR } from "@/lib/constants";

interface SettingsFormProps {
	/** Instance to edit; pass `null` to create a new one. */
	instance: Instance | null;
	/** Called after a successful save. Receives the saved instance id. */
	onSaved?: (id: string) => void;
	/** Called when the user cancels (only meaningful when there's something to cancel back to). */
	onCancel?: () => void;
	/** Hide the cancel button. */
	hideCancel?: boolean;
	/** Override the submit button label. */
	submitLabel?: string;
}

const statusConfig = {
	ok: { icon: CheckCircle, color: COLOR.success, label: "Connected" },
	"auth-required": { icon: AlertCircle, color: COLOR.warning, label: "Auth required" },
	unreachable: { icon: WifiOff, color: COLOR.destructive, label: "Unreachable" },
	checking: { icon: Loader, color: COLOR.accentText, label: "Checking..." },
};

export function SettingsForm({
	instance,
	onSaved,
	onCancel,
	hideCancel,
	submitLabel,
}: SettingsFormProps) {
	const { add, update, activate } = useInstances();

	const [name, setName] = useState(instance?.name ?? "");
	const [baseUrl, setBaseUrl] = useState(instance?.baseUrl ?? "http://localhost:8000");
	const [token, setToken] = useState(instance?.token ?? "");
	const [errors, setErrors] = useState<Partial<Record<keyof Instance, string>>>({});
	const [saved, setSaved] = useState(false);
	const [health, setHealth] = useState<{ status: HealthStatus; message: string } | null>(null);
	const [checking, setChecking] = useState(false);

	const isCreate = instance === null;

	async function handleTest() {
		setChecking(true);
		setHealth({ status: "checking", message: "Connecting..." });
		const result = await checkConnection(baseUrl, token || undefined);
		setHealth(result);
		setChecking(false);

		if (result.status === "auth-required" && !token) {
			document.getElementById("honcho-token")?.focus();
		}
	}

	function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const candidate = {
			id: instance?.id ?? "placeholder",
			name: name.trim() || "Default",
			baseUrl,
			token,
		};
		const result = instanceSchema.safeParse(candidate);
		if (!result.success) {
			const fieldErrors: typeof errors = {};
			for (const issue of result.error.issues) {
				const key = issue.path[0] as keyof Instance;
				fieldErrors[key] = issue.message;
			}
			setErrors(fieldErrors);
			return;
		}
		setErrors({});

		let id: string;
		if (isCreate) {
			const created = add({
				name: result.data.name,
				baseUrl: result.data.baseUrl,
				token: result.data.token,
			});
			activate(created.id);
			id = created.id;
		} else {
			update(instance.id, {
				name: result.data.name,
				baseUrl: result.data.baseUrl,
				token: result.data.token,
			});
			id = instance.id;
		}

		setSaved(true);
		setTimeout(() => {
			setSaved(false);
			onSaved?.(id);
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
			{/* Name */}
			<div>
				<Label className="mb-1.5 text-sm">Instance Name</Label>
				<Input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. Local, Staging, Production"
					className="rounded-xl"
				/>
				{errors.name && (
					<p className="text-xs mt-1" style={{ color: COLOR.destructive }}>
						{errors.name}
					</p>
				)}
				<Muted className="text-xs mt-1.5">A short label to identify this connection</Muted>
			</div>

			{/* Base URL */}
			<div>
				<Label className="mb-1.5 text-sm">Honcho Base URL</Label>
				<div className="flex gap-2">
					<Input
						type="url"
						value={baseUrl}
						onChange={(e) => {
							setBaseUrl(e.target.value);
							setHealth(null);
						}}
						placeholder="http://localhost:8000"
						className="flex-1 font-mono rounded-xl"
					/>
					<Button
						type="button"
						variant="accent"
						onClick={handleTest}
						disabled={checking || !baseUrl}
						className="rounded-xl"
					>
						{checking ? (
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
							>
								<Loader className="w-4 h-4" strokeWidth={1.5} />
							</motion.div>
						) : (
							<Wifi className="w-4 h-4" strokeWidth={1.5} />
						)}
						<span className="hidden sm:block">Test</span>
					</Button>
				</div>
				{errors.baseUrl && (
					<p className="text-xs mt-1" style={{ color: COLOR.destructive }}>
						{errors.baseUrl}
					</p>
				)}
				<Muted className="text-xs mt-1.5">URL of your self-hosted Honcho instance</Muted>
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
								<p
									className="text-sm font-medium"
									style={{ color: statusConfig[health.status].color }}
								>
									{statusConfig[health.status].label}
								</p>
								<Muted className="text-xs mt-0.5">{health.message}</Muted>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Token */}
			<div>
				<Label htmlFor="honcho-token" className="flex items-center gap-1.5 mb-1.5 text-sm">
					{token ? (
						<Lock className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					) : (
						<LockOpen
							className="w-3.5 h-3.5"
							style={{ color: "var(--text-3)" }}
							strokeWidth={1.5}
						/>
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
				</Label>
				<Textarea
					id="honcho-token"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					rows={2}
					placeholder="eyJ... (required only if your instance has auth enabled)"
					className="font-mono rounded-xl"
				/>
				{health?.status === "auth-required" && !token && (
					<motion.p
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-xs mt-1"
						style={{ color: COLOR.warning }}
					>
						This instance requires an API token to proceed
					</motion.p>
				)}
			</div>

			<div className="flex gap-2">
				{!hideCancel && onCancel && (
					<Button
						type="button"
						variant="ghost"
						onClick={onCancel}
						className="py-2.5 px-4 rounded-xl"
					>
						Cancel
					</Button>
				)}
				<Button
					type="submit"
					variant="primary"
					className="flex-1 py-2.5 px-4 rounded-xl"
					style={saved ? { background: "#059669" } : undefined}
				>
					{saved ? "✓ Saved" : (submitLabel ?? (isCreate ? "Add Instance" : "Save Changes"))}
				</Button>
			</div>
		</form>
	);
}
