import { motion } from "framer-motion";
import { Check, Pencil, Plus, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import type { Instance } from "@/lib/config";
import { COLOR } from "@/lib/constants";

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; id: string };

interface InstancesManagerProps {
	onActivated?: () => void;
}

export function InstancesManager({ onActivated }: InstancesManagerProps) {
	const { instances, activeId, activate, remove } = useInstances();
	const [mode, setMode] = useState<Mode>({ kind: "list" });

	if (mode.kind === "create") {
		return (
			<SettingsForm
				instance={null}
				onSaved={() => {
					setMode({ kind: "list" });
					onActivated?.();
				}}
				onCancel={instances.length > 0 ? () => setMode({ kind: "list" }) : undefined}
				hideCancel={instances.length === 0}
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

	if (instances.length === 0) {
		return (
			<SettingsForm
				instance={null}
				onSaved={() => onActivated?.()}
				hideCancel
				submitLabel="Save Connection"
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

			<Button
				type="button"
				variant="ghost"
				onClick={() => setMode({ kind: "create" })}
				className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2"
			>
				<Plus className="w-4 h-4" strokeWidth={1.5} />
				Add another instance
			</Button>
		</div>
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
						{instance.baseUrl.replace(/^https?:\/\//, "")}
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
