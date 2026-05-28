import { motion } from "framer-motion";
import { Loader, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import { COLOR } from "@/lib/constants";
import {
	type DiscoveredInstance,
	discoverHonchoInstances,
	suggestNameForInstance,
} from "@/lib/discovery";

interface Row {
	discovered: DiscoveredInstance;
	suggestedName: string;
	checked: boolean;
}

interface Props {
	/** If true, scan as soon as the component mounts. */
	autoRun?: boolean;
	/** Called after the user has added at least one instance. */
	onAdded?: () => void;
}

export function DiscoveredInstances({ autoRun = false, onAdded }: Props) {
	const { instances, add, activate } = useInstances();
	const [scanning, setScanning] = useState(false);
	const [hasScanned, setHasScanned] = useState(false);
	const [rows, setRows] = useState<Row[]>([]);

	const existingBaseUrls = useMemo(
		() => new Set(instances.map((i) => i.baseUrl.replace(/\/+$/, "").toLowerCase())),
		[instances],
	);

	const runScan = useCallback(async () => {
		setScanning(true);
		try {
			const found = await discoverHonchoInstances();
			const fresh = found.filter(
				(d) => !existingBaseUrls.has(d.base_url.replace(/\/+$/, "").toLowerCase()),
			);
			const named = await Promise.all(
				fresh.map(async (d) => {
					const name = (await suggestNameForInstance(d.base_url)) ?? `Honcho :${d.port}`;
					return { discovered: d, suggestedName: name, checked: true } satisfies Row;
				}),
			);
			setRows(named);
		} finally {
			setScanning(false);
			setHasScanned(true);
		}
	}, [existingBaseUrls]);

	useEffect(() => {
		if (autoRun) void runScan();
	}, [autoRun, runScan]);

	function setRowChecked(port: number, checked: boolean) {
		setRows((r) => r.map((row) => (row.discovered.port === port ? { ...row, checked } : row)));
	}

	function setRowName(port: number, suggestedName: string) {
		setRows((r) =>
			r.map((row) => (row.discovered.port === port ? { ...row, suggestedName } : row)),
		);
	}

	function addSelected() {
		const selected = rows.filter((r) => r.checked);
		if (selected.length === 0) return;
		let firstId: string | null = null;
		for (const row of selected) {
			const created = add({
				name: row.suggestedName.trim() || `Honcho :${row.discovered.port}`,
				baseUrl: row.discovered.base_url,
				token: "",
			});
			if (firstId === null) firstId = created.id;
		}
		if (firstId) activate(firstId);
		setRows([]);
		onAdded?.();
	}

	const selectedCount = rows.filter((r) => r.checked).length;

	return (
		<div
			className="rounded-2xl p-5 space-y-3"
			style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Sparkles
						className="w-4 h-4 shrink-0"
						style={{ color: COLOR.accentText }}
						strokeWidth={1.5}
					/>
					<div>
						<p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
							Discover local Honcho instances
						</p>
						<Muted className="text-xs">Scans 127.0.0.1:8000–8100 for running instances</Muted>
					</div>
				</div>
				<Button
					type="button"
					variant="ghost"
					onClick={() => void runScan()}
					disabled={scanning}
					className="rounded-xl px-3 py-2"
					title="Rescan"
				>
					{scanning ? (
						<motion.div
							animate={{ rotate: 360 }}
							transition={{
								duration: 1,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
							}}
						>
							<Loader className="w-4 h-4" strokeWidth={1.5} />
						</motion.div>
					) : (
						<RefreshCw className="w-4 h-4" strokeWidth={1.5} />
					)}
					<span className="hidden sm:inline ml-1.5 text-xs">
						{scanning ? "Scanning…" : "Rescan"}
					</span>
				</Button>
			</div>

			{hasScanned && !scanning && rows.length === 0 && (
				<Muted className="text-xs">
					No new instances found. Add one manually below if you know its URL.
				</Muted>
			)}

			{rows.length > 0 && (
				<>
					<div className="space-y-1.5">
						{rows.map((row) => (
							<DiscoveredRow
								key={row.discovered.port}
								row={row}
								onCheck={(c) => setRowChecked(row.discovered.port, c)}
								onRename={(n) => setRowName(row.discovered.port, n)}
							/>
						))}
					</div>
					<Button
						type="button"
						variant="accent"
						onClick={addSelected}
						disabled={selectedCount === 0}
						className="w-full rounded-xl py-2.5"
					>
						{selectedCount === 0
							? "Select at least one"
							: `Add ${selectedCount} instance${selectedCount === 1 ? "" : "s"}`}
					</Button>
				</>
			)}
		</div>
	);
}

interface DiscoveredRowProps {
	row: Row;
	onCheck: (checked: boolean) => void;
	onRename: (name: string) => void;
}

function DiscoveredRow({ row, onCheck, onRename }: DiscoveredRowProps) {
	return (
		<div
			className="flex items-center gap-2.5 rounded-xl px-3 py-2"
			style={{
				background: row.checked ? "var(--surface)" : "transparent",
				border: `1px solid ${row.checked ? "var(--accent-border)" : "var(--border)"}`,
			}}
		>
			<input
				type="checkbox"
				checked={row.checked}
				onChange={(e) => onCheck(e.target.checked)}
				className="w-4 h-4 shrink-0 cursor-pointer"
				aria-label={`Select ${row.suggestedName}`}
			/>
			<input
				type="text"
				value={row.suggestedName}
				onChange={(e) => onRename(e.target.value)}
				className="flex-1 min-w-0 bg-transparent text-sm font-medium border-0 outline-none px-1 py-0.5 rounded"
				style={{ color: "var(--text-1)" }}
				aria-label={`Name for instance on port ${row.discovered.port}`}
				disabled={!row.checked}
			/>
			<span className="text-xs font-mono shrink-0" style={{ color: "var(--text-4)" }}>
				:{row.discovered.port}
			</span>
		</div>
	);
}
