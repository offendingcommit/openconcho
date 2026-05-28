import { Save, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { SeedKit } from "@/lib/seedKits";

interface SeedKitFormProps {
	initial?: Pick<SeedKit, "name" | "description" | "lines">;
	onSubmit: (input: { name: string; description: string; lines: string[] }) => void;
	onCancel: () => void;
	submitLabel?: string;
}

export function SeedKitForm({
	initial,
	onSubmit,
	onCancel,
	submitLabel = "Save kit",
}: SeedKitFormProps) {
	const [name, setName] = useState(initial?.name ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [linesText, setLinesText] = useState((initial?.lines ?? []).join("\n"));
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Name is required");
			return;
		}
		const lines = linesText
			.split("\n")
			.map((l) => l.trimEnd())
			.filter((l) => l.length > 0);
		if (lines.length === 0) {
			setError("Add at least one line");
			return;
		}
		setError(null);
		onSubmit({ name: trimmedName, description: description.trim(), lines });
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<div>
				<label
					htmlFor="kit-name"
					className="text-xs font-medium block mb-1"
					style={{ color: "var(--text-3)" }}
				>
					Name
				</label>
				<Input
					id="kit-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. Personal core"
				/>
			</div>

			<div>
				<label
					htmlFor="kit-description"
					className="text-xs font-medium block mb-1"
					style={{ color: "var(--text-3)" }}
				>
					Description{" "}
					<span style={{ color: "var(--text-4)" }} className="font-normal">
						(optional)
					</span>
				</label>
				<Input
					id="kit-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Short summary of what this kit seeds"
				/>
			</div>

			<div>
				<label
					htmlFor="kit-lines"
					className="text-xs font-medium block mb-1"
					style={{ color: "var(--text-3)" }}
				>
					Lines{" "}
					<span style={{ color: "var(--text-4)" }} className="font-normal">
						(one per line — e.g. <span className="font-mono">Name: Ben</span>)
					</span>
				</label>
				<Textarea
					id="kit-lines"
					value={linesText}
					onChange={(e) => setLinesText(e.target.value)}
					rows={10}
					className="font-mono resize-y"
					style={{ minHeight: "12rem" }}
					placeholder={"Name: \nEmail: \nRole: "}
				/>
			</div>

			{error && (
				<p className="text-xs" style={{ color: "#f87171" }}>
					{error}
				</p>
			)}

			<div className="flex justify-end gap-2 pt-2">
				<Button type="button" variant="surface" onClick={onCancel}>
					<X className="w-3.5 h-3.5" strokeWidth={2} />
					Cancel
				</Button>
				<Button type="submit" variant="accent">
					<Save className="w-3.5 h-3.5" strokeWidth={2} />
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}
