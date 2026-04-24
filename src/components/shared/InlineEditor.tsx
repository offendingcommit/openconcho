import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface InlineEditorProps {
	value: string;
	onSave: (value: string) => void;
	loading?: boolean;
	placeholder?: string;
	className?: string;
}

export function InlineEditor({
	value,
	onSave,
	loading = false,
	placeholder = "Click to edit",
	className = "",
}: InlineEditorProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editing) {
			setDraft(value);
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [editing, value]);

	const commit = () => {
		if (draft.trim() && draft !== value) onSave(draft.trim());
		setEditing(false);
	};

	const cancel = () => {
		setDraft(value);
		setEditing(false);
	};

	if (!editing) {
		return (
			<button
				onClick={() => setEditing(true)}
				className={`group flex items-center gap-1.5 text-left transition-colors ${className}`}
				style={{ color: "var(--text-1)" }}
			>
				<span>{value || <span style={{ color: "var(--text-4)" }}>{placeholder}</span>}</span>
				<Pencil
					className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
					style={{ color: "var(--text-4)" }}
					strokeWidth={2}
				/>
			</button>
		);
	}

	return (
		<div className="flex items-center gap-1">
			<input
				ref={inputRef}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") commit();
					if (e.key === "Escape") cancel();
				}}
				onBlur={commit}
				disabled={loading}
				className="text-sm px-2 py-0.5 rounded-md flex-1 min-w-0"
				style={{
					background: "var(--surface)",
					border: "1px solid var(--accent-border)",
					color: "var(--text-1)",
					outline: "none",
				}}
			/>
			<button
				onMouseDown={(e) => { e.preventDefault(); commit(); }}
				className="p-1 rounded"
				style={{ color: "var(--accent-text)" }}
			>
				<Check className="w-3.5 h-3.5" strokeWidth={2.5} />
			</button>
			<button
				onMouseDown={(e) => { e.preventDefault(); cancel(); }}
				className="p-1 rounded"
				style={{ color: "var(--text-4)" }}
			>
				<X className="w-3.5 h-3.5" strokeWidth={2.5} />
			</button>
		</div>
	);
}
