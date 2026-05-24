import { motion } from "framer-motion";
import { Copy, Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { ApplyKitDialog } from "@/components/seed-kits/ApplyKitDialog";
import { SeedKitForm } from "@/components/seed-kits/SeedKitForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Body, Caption, MonoCaption, PageTitle } from "@/components/ui/typography";
import {
	BUILTIN_KITS,
	createKit,
	deleteKit,
	isBuiltinKit,
	loadUserKits,
	type SeedKit,
	updateKit,
} from "@/lib/seedKits";

const EVENT = "openconcho:seed-kits-changed";

function emit() {
	window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
	window.addEventListener(EVENT, cb);
	window.addEventListener("storage", cb);
	return () => {
		window.removeEventListener(EVENT, cb);
		window.removeEventListener("storage", cb);
	};
}

let cachedKey = "";
let cachedSnapshot: SeedKit[] = [];

function getSnapshot(): SeedKit[] {
	const next = loadUserKits();
	const key = JSON.stringify(next);
	if (key !== cachedKey) {
		cachedKey = key;
		cachedSnapshot = next;
	}
	return cachedSnapshot;
}

function getServerSnapshot(): SeedKit[] {
	return cachedSnapshot;
}

function useUserKits(): SeedKit[] {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type Mode =
	| { kind: "list" }
	| { kind: "create"; initial?: Pick<SeedKit, "name" | "description" | "lines"> }
	| { kind: "edit"; id: string };

export function SeedKitsView() {
	const userKits = useUserKits();
	const [mode, setMode] = useState<Mode>({ kind: "list" });
	const [applyTarget, setApplyTarget] = useState<SeedKit | null>(null);

	if (mode.kind === "create") {
		return (
			<div className="page-container">
				<header className="mb-6">
					<PageTitle>New seed kit</PageTitle>
					<Body className="mt-1">Define the lines that will be merged into a peer's card.</Body>
				</header>
				<div
					className="rounded-xl p-5"
					style={{
						background: "var(--bg-2)",
						border: "1px solid var(--border)",
					}}
				>
					<SeedKitForm
						initial={mode.initial}
						submitLabel="Create kit"
						onSubmit={(input) => {
							createKit(input);
							emit();
							setMode({ kind: "list" });
						}}
						onCancel={() => setMode({ kind: "list" })}
					/>
				</div>
			</div>
		);
	}

	if (mode.kind === "edit") {
		const kit = userKits.find((k) => k.id === mode.id);
		if (!kit) {
			return (
				<div className="page-container">
					<Body>Kit not found.</Body>
					<Button variant="ghost" onClick={() => setMode({ kind: "list" })} className="mt-3">
						Back
					</Button>
				</div>
			);
		}
		return (
			<div className="page-container">
				<header className="mb-6">
					<PageTitle>Edit seed kit</PageTitle>
					<Body className="mt-1">{kit.name}</Body>
				</header>
				<div
					className="rounded-xl p-5"
					style={{
						background: "var(--bg-2)",
						border: "1px solid var(--border)",
					}}
				>
					<SeedKitForm
						initial={kit}
						submitLabel="Save changes"
						onSubmit={(input) => {
							updateKit(kit.id, input);
							emit();
							setMode({ kind: "list" });
						}}
						onCancel={() => setMode({ kind: "list" })}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="page-container">
			<motion.header
				initial={{ opacity: 0, y: -6 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-6 flex items-start justify-between gap-4 flex-wrap"
			>
				<div>
					<PageTitle className="flex items-center gap-2">
						<Layers className="w-5 h-5" style={{ color: "var(--accent-text)" }} strokeWidth={1.5} />
						Seed Kits
					</PageTitle>
					<Body className="mt-1 max-w-xl">
						Pre-defined sets of card lines you can apply to any peer in one click. Useful for
						seeding identity facts across multiple agents.
					</Body>
				</div>
				<Button variant="accent" onClick={() => setMode({ kind: "create" })}>
					<Plus className="w-3.5 h-3.5" strokeWidth={2} />
					New kit
				</Button>
			</motion.header>

			<section className="mb-8">
				<div className="flex items-center gap-2 mb-3">
					<h2
						className="text-xs font-medium uppercase tracking-wider"
						style={{ color: "var(--text-3)" }}
					>
						Built-in starters
					</h2>
					<Caption>Read-only — fork to customize</Caption>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{BUILTIN_KITS.map((kit) => (
						<KitCard
							key={kit.id}
							kit={kit}
							onApply={() => setApplyTarget(kit)}
							onFork={() =>
								setMode({
									kind: "create",
									initial: {
										name: `${kit.name} (copy)`,
										description: kit.description,
										lines: [...kit.lines],
									},
								})
							}
						/>
					))}
				</div>
			</section>

			<section>
				<div className="flex items-center gap-2 mb-3">
					<h2
						className="text-xs font-medium uppercase tracking-wider"
						style={{ color: "var(--text-3)" }}
					>
						Your kits
					</h2>
					<Caption>
						{userKits.length} kit{userKits.length === 1 ? "" : "s"}
					</Caption>
				</div>
				{userKits.length === 0 ? (
					<EmptyState
						icon={Sparkles}
						title="No custom kits yet"
						description="Create your first kit, or fork a built-in to get started."
						action={
							<Button variant="accent" onClick={() => setMode({ kind: "create" })}>
								<Plus className="w-3.5 h-3.5" strokeWidth={2} />
								New kit
							</Button>
						}
					/>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{userKits.map((kit) => (
							<KitCard
								key={kit.id}
								kit={kit}
								onApply={() => setApplyTarget(kit)}
								onEdit={() => setMode({ kind: "edit", id: kit.id })}
								onDelete={() => {
									deleteKit(kit.id);
									emit();
								}}
								onFork={() =>
									setMode({
										kind: "create",
										initial: {
											name: `${kit.name} (copy)`,
											description: kit.description,
											lines: [...kit.lines],
										},
									})
								}
							/>
						))}
					</div>
				)}
			</section>

			<ApplyKitDialog
				kit={applyTarget}
				open={applyTarget !== null}
				onClose={() => setApplyTarget(null)}
			/>
		</div>
	);
}

interface KitCardProps {
	kit: SeedKit;
	onApply: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
	onFork: () => void;
}

function KitCard({ kit, onApply, onEdit, onDelete, onFork }: KitCardProps) {
	const builtin = isBuiltinKit(kit);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			className="rounded-xl p-4 flex flex-col gap-3"
			style={{
				background: "var(--bg-2)",
				border: "1px solid var(--border)",
			}}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 mb-1 flex-wrap">
					<h3
						className="text-sm font-medium truncate"
						style={{ color: "var(--text-1)" }}
						title={kit.name}
					>
						{kit.name}
					</h3>
					{builtin && (
						<span
							className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
							style={{
								background: "var(--accent-dim)",
								color: "var(--accent-text)",
								border: "1px solid var(--accent-border)",
							}}
						>
							built-in
						</span>
					)}
				</div>
				{kit.description && <Caption className="block leading-relaxed">{kit.description}</Caption>}
			</div>

			<div
				className="rounded-md px-3 py-2 font-mono text-xs space-y-0.5 max-h-32 overflow-y-auto"
				style={{
					background: "var(--surface)",
					border: "1px solid var(--border)",
				}}
			>
				{kit.lines.length === 0 ? (
					<MonoCaption>(no lines)</MonoCaption>
				) : (
					kit.lines.map((line, i) => (
						<div
							key={`${i}-${line}`}
							className="truncate"
							style={{ color: "var(--text-2)" }}
							title={line}
						>
							{line || <span style={{ color: "var(--text-4)" }}>(empty)</span>}
						</div>
					))
				)}
			</div>

			<div className="flex items-center justify-between gap-2 mt-auto">
				<Button variant="accent" size="sm" onClick={onApply}>
					<Sparkles className="w-3 h-3" strokeWidth={2} />
					Apply
				</Button>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="sm" onClick={onFork} title="Fork into a new kit">
						<Copy className="w-3 h-3" strokeWidth={2} />
					</Button>
					{!builtin && onEdit && (
						<Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
							<Pencil className="w-3 h-3" strokeWidth={2} />
						</Button>
					)}
					{!builtin &&
						onDelete &&
						(confirmingDelete ? (
							<button
								type="button"
								onClick={() => {
									onDelete();
									setConfirmingDelete(false);
								}}
								className="text-xs font-medium px-2 py-1 rounded-md"
								style={{
									color: "#f87171",
									border: "1px solid #f87171",
								}}
							>
								Confirm
							</button>
						) : (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setConfirmingDelete(true)}
								title="Delete"
							>
								<Trash2 className="w-3 h-3" strokeWidth={2} />
							</Button>
						))}
				</div>
			</div>
		</motion.div>
	);
}
