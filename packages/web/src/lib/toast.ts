export type ToastKind = "success" | "error" | "info";

export interface Toast {
	id: number;
	message: string;
	kind: ToastKind;
}

const DEFAULT_DURATION_MS = 3500;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
	for (const cb of listeners) cb();
}

export function subscribeToasts(cb: () => void): () => void {
	listeners.add(cb);
	return () => listeners.delete(cb);
}

export function getToasts(): Toast[] {
	return toasts;
}

export function dismissToast(id: number): void {
	toasts = toasts.filter((t) => t.id !== id);
	emit();
}

export function toast(
	message: string,
	opts: { kind?: ToastKind; durationMs?: number } = {},
): number {
	const id = nextId++;
	const entry: Toast = { id, message, kind: opts.kind ?? "success" };
	toasts = [...toasts, entry];
	emit();
	const duration = opts.durationMs ?? DEFAULT_DURATION_MS;
	if (duration > 0 && typeof window !== "undefined") {
		window.setTimeout(() => dismissToast(id), duration);
	}
	return id;
}

export function clearToasts(): void {
	toasts = [];
	emit();
}
