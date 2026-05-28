import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	ChevronRight,
	Cloud,
	Pencil,
	Plus,
	Radar,
	Server,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DiscoveredInstances } from "@/components/settings/DiscoveredInstances";
import { type ConnectionPreset, SettingsForm } from "@/components/settings/SettingsForm";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import { checkConnection, HONCHO_CLOUD_URL, type Instance, isCloudInstance } from "@/lib/config";
import { COLOR } from "@/lib/constants";
import { isTauri } from "@/lib/discovery";

const LOCALHOST_PROBE_URL = "http://localhost:8000";

type Mode =
	| { kind: "list" }
	| { kind: "choose-type" }
	| { kind: "create"; preset: ConnectionPreset }
	| { kind: "edit"; id: string }
	| { kind: "discover" };

interface InstancesManagerProps {
	onActivated?: () => void;
}

export function InstancesManager({ onActivated }: InstancesManagerProps) {
	const { instances, activeId, activate, remove } = useInstances();
	const isFirstRun = instances.length === 0;
	const inTauri = isTauri();
	const [mode, setMode] = useState<Mode>(isFirstRun ? { kind: "choose-type" } : { kind: "list" });

	const backFromCreate = () => setMode(isFirstRun ? { kind: "choose-type" } : { kind: "list" });

	if (mode.kind === "discover") {
		return (
			<div className="space-y-3">
				<DiscoveredInstances autoRun onAdded={() => setMode({ kind: "list" })} />
				<Button
					type="button"
					variant="ghost"
					onClick={() => setMode({ kind: "list" })}
					className="w-full py-2.5 px-4 rounded-xl"
				>
					Back
				</Button>
			</div>
		);
	}

	if (mode.kind === "choose-type") {
		return (
			<div className="space-y-3">
				{inTauri && (
					<DiscoveredInstances
						autoRun
						onAdded={() => {
							setMode({ kind: "list" });
							onActivated?.();
						}}
					/>
				)}
				<ConnectionTypeChooser
					onPick={(preset) => setMode({ kind: "create", preset })}
					onCancel={isFirstRun ? undefined : () => setMode({ kind: "list" })}
				/>
			</div>
		);
	}

	if (mode.kind === "create") {
		return (
			<SettingsForm
				instance={null}
				preset={mode.preset}
				onSaved={() => {
					setMode({ kind: "list" });
					onActivated?.();
				}}
				onCancel={backFromCreate}
				hideCancel={false}
				submitLabel={isFirstRun ? "Save Connection" : undefined}
			/>
		);
	}

	if (mode.kind === "edit") {
		const target = instances.find((i) => i.id === mode.id);
		if (!target) return null;
		return (
			<SettingsForm
				instance={target}
				onSaved={() => setMode({ kind: "list" })}
				onCancel={() => setMode({ kind: "list" })}
			/>
		);
	}

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				{instances.map((inst) => (
					<InstanceRow
						key={inst.id}
						instance={inst}
						active={inst.id === activeId}
						onActivate={() => {
							activate(inst.id);
							onActivated?.();
						}}
						onEdit={() => setMode({ kind: "edit", id: inst.id })}
						onDelete={() => remove(inst.id)}
					/>
				))}
			</div>

			{inTauri && (
				<Button
					type="button"
					variant="ghost"
					onClick={() => setMode({ kind: "discover" })}
					className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2"
				>
					<Radar className="w-4 h-4" strokeWidth={1.5} />
					Discover instances
				</Button>
			)}

			<Button
				type="button"
				variant="ghost"
				onClick={() => setMode({ kind: "choose-type" })}
				className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2"
			>
				<Plus className="w-4 h-4" strokeWidth={1.5} />
				Add another instance
			</Button>
		</div>
	);
}

interface ConnectionTypeChooserProps {
	onPick: (preset: ConnectionPreset) => void;
	onCancel?: () => void;
}

function ConnectionTypeChooser({ onPick, onCancel }: ConnectionTypeChooserProps) {
	const [localhostDetected, setLocalhostDetected] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void checkConnection(LOCALHOST_PROBE_URL).then((result) => {
			if (cancelled) return;
			if (result.status === "ok" || result.status === "auth-required") {
				setLocalhostDetected(true);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div
			className="rounded-2xl p-6 space-y-3"
			style={{
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
			}}
		>
			<div className="mb-2">
				<h2 className="text-base font-medium" style={{ color: "var(--text-1)" }}>
					How do you want to connect?
				</h2>
				<Muted className="text-xs mt-1">
					You can add more connections later — Cloud, self-hosted, or both.
				</Muted>
			</div>

			<AnimatePresence>
				{localhostDetected && (
					<motion.button
						type="button"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						onClick={() => onPick("self-hosted")}
						className="w-full overflow-hidden rounded-xl p-3 flex items-center gap-2.5 text-left"
						style={{
							background: COLOR.successDim,
							border: `1px solid ${COLOR.successBorder}`,
						}}
					>
						<Sparkles
							className="w-4 h-4 shrink-0"
							style={{ color: COLOR.success }}
							strokeWidth={1.5}
						/>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-medium" style={{ color: COLOR.success }}>
								Detected Honcho at {LOCALHOST_PROBE_URL.replace(/^https?:\/\//, "")}
							</p>
							<Muted className="text-xs mt-0.5">Tap to connect to it</Muted>
						</div>
					</motion.button>
				)}
			</AnimatePresence>

			<ConnectionTypeButton
				icon={Cloud}
				title="Honcho Cloud"
				description={`Hosted at ${HONCHO_CLOUD_URL.replace(/^https?:\/\//, "")} — sign in with your API key`}
				accent
				onClick={() => onPick("cloud")}
			/>

			<ConnectionTypeButton
				icon={Server}
				title="Self-Hosted"
				description="Connect to your own Honcho deployment"
				onClick={() => onPick("self-hosted")}
			/>

			{onCancel && (
				<div className="pt-1">
					<Button
						type="button"
						variant="ghost"
						onClick={onCancel}
						className="w-full py-2 px-4 rounded-xl"
					>
						Cancel
					</Button>
				</div>
			)}
		</div>
	);
}

interface ConnectionTypeButtonProps {
	icon: typeof Cloud;
	title: string;
	description: string;
	accent?: boolean;
	onClick: () => void;
}

function ConnectionTypeButton({
	icon: Icon,
	title,
	description,
	accent,
	onClick,
}: ConnectionTypeButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded-xl p-4 flex items-center gap-3 text-left transition-colors"
			style={{
				background: "var(--surface)",
				border: `1px solid ${accent ? "var(--accent-border)" : "var(--border)"}`,
			}}
		>
			<div
				className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
				style={{
					background: accent ? "var(--accent)" : "var(--bg-2)",
					color: accent ? "white" : "var(--text-2)",
				}}
			>
				<Icon className="w-5 h-5" strokeWidth={1.5} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
					{title}
				</p>
				<Muted className="text-xs mt-0.5">{description}</Muted>
			</div>
			<ChevronRight
				className="w-4 h-4 shrink-0"
				style={{ color: "var(--text-3)" }}
				strokeWidth={1.5}
			/>
		</button>
	);
}

interface InstanceRowProps {
	instance: Instance;
	active: boolean;
	onActivate: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

function InstanceRow({ instance, active, onActivate, onEdit, onDelete }: InstanceRowProps) {
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const cloud = isCloudInstance(instance);

	return (
		<motion.div
			layout
			className="rounded-xl p-3 flex items-center gap-3"
			style={{
				background: active ? "var(--accent-dim)" : "var(--bg-2)",
				border: `1px solid ${active ? "var(--accent-border)" : "var(--border)"}`,
			}}
		>
			<button
				type="button"
				onClick={onActivate}
				className="flex-1 flex items-center gap-3 text-left"
				disabled={active}
				title={active ? "Active instance" : "Switch to this instance"}
			>
				<div
					className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
					style={{
						background: active ? "var(--accent)" : "var(--surface)",
						color: active ? "white" : "var(--text-3)",
					}}
				>
					{active ? (
						<Check className="w-4 h-4" strokeWidth={2} />
					) : cloud ? (
						<Cloud className="w-4 h-4" strokeWidth={1.5} />
					) : (
						<Server className="w-4 h-4" strokeWidth={1.5} />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p
						className="text-sm font-medium truncate"
						style={{ color: active ? "var(--accent-text)" : "var(--text-1)" }}
					>
						{instance.name}
					</p>
					<Muted className="text-xs font-mono truncate">
						{cloud ? "Honcho Cloud" : instance.baseUrl.replace(/^https?:\/\//, "")}
					</Muted>
				</div>
			</button>

			<div className="flex items-center gap-1 shrink-0">
				<button
					type="button"
					onClick={onEdit}
					className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
					style={{ color: "var(--text-3)" }}
					title="Edit"
				>
					<Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
				</button>
				{confirmingDelete ? (
					<button
						type="button"
						onClick={() => {
							onDelete();
							setConfirmingDelete(false);
						}}
						className="text-xs font-medium px-2 py-1 rounded-md"
						style={{ color: COLOR.destructive, border: `1px solid ${COLOR.destructive}` }}
					>
						Confirm
					</button>
				) : (
					<button
						type="button"
						onClick={() => setConfirmingDelete(true)}
						className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
						style={{ color: "var(--text-3)" }}
						title="Delete"
					>
						<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
					</button>
				)}
			</div>
		</motion.div>
	);
}
