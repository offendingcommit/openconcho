import { z } from "zod";
import { dispatchFor, PROXY_REJECT_HEADER } from "@/lib/dispatch";
import { runtimeDefaultBaseUrl } from "@/lib/runtimeConfig";

const LEGACY_KEY = "openconcho:config";
const STORE_KEY = "openconcho:instances";

export const HONCHO_CLOUD_URL = "https://api.honcho.dev";

/**
 * Connection-test timeout. Generous because a cold/idle self-hosted Honcho (DB
 * pool spin-up, tunnel wake) can take several seconds on its first request — a
 * tight 5s budget reported live-and-reachable instances as "Connection timed out".
 */
export const CONNECTION_TIMEOUT_MS = 15_000;

function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, "").toLowerCase();
}

export function isCloudInstance(instance: Pick<Instance, "baseUrl">): boolean {
	return normalizeBaseUrl(instance.baseUrl) === HONCHO_CLOUD_URL;
}

export const configSchema = z.object({
	baseUrl: z.url({ message: "Must be a valid URL" }),
	token: z.string().optional().default(""),
});

export type Config = z.infer<typeof configSchema>;

export const instanceSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, { message: "Name is required" }),
	baseUrl: z.url({ message: "Must be a valid URL" }),
	token: z.string().optional().default(""),
});

export type Instance = z.infer<typeof instanceSchema>;

const storeSchema = z.object({
	instances: z.array(instanceSchema),
	activeId: z.string().nullable(),
});

export type InstanceStore = z.infer<typeof storeSchema>;

function newId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `inst_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function migrateLegacy(): InstanceStore | null {
	const raw = localStorage.getItem(LEGACY_KEY);
	if (!raw) return null;
	try {
		const parsed = configSchema.parse(JSON.parse(raw));
		const inst: Instance = {
			id: newId(),
			name: "Default",
			baseUrl: parsed.baseUrl,
			token: parsed.token,
		};
		const store: InstanceStore = { instances: [inst], activeId: inst.id };
		localStorage.setItem(STORE_KEY, JSON.stringify(store));
		localStorage.removeItem(LEGACY_KEY);
		return store;
	} catch {
		return null;
	}
}

export function loadStore(): InstanceStore {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		if (raw) return storeSchema.parse(JSON.parse(raw));
	} catch {
		// fall through
	}
	const migrated = migrateLegacy();
	if (migrated) return migrated;

	// First-run default from a container's runtime config (no-op outside Docker).
	const runtimeUrl = runtimeDefaultBaseUrl();
	if (runtimeUrl) {
		const inst: Instance = {
			id: "runtime-default",
			name: "Honcho",
			baseUrl: runtimeUrl,
			token: "",
		};
		return { instances: [inst], activeId: inst.id };
	}
	return { instances: [], activeId: null };
}

export function saveStore(store: InstanceStore): void {
	localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getActiveInstance(): Instance | null {
	const store = loadStore();
	if (!store.activeId) return null;
	return store.instances.find((i) => i.id === store.activeId) ?? null;
}

export function loadConfig(): Config | null {
	const active = getActiveInstance();
	if (!active) return null;
	return { baseUrl: active.baseUrl, token: active.token ?? "" };
}

/** Backwards-compatible single-instance save: replaces or creates a "Default" instance. */
export function saveConfig(config: Config): void {
	const store = loadStore();
	if (store.activeId) {
		const idx = store.instances.findIndex((i) => i.id === store.activeId);
		if (idx >= 0) {
			store.instances[idx] = { ...store.instances[idx], ...config };
			saveStore(store);
			return;
		}
	}
	const inst: Instance = { id: newId(), name: "Default", ...config };
	saveStore({ instances: [...store.instances, inst], activeId: inst.id });
}

export function clearConfig(): void {
	localStorage.removeItem(STORE_KEY);
	localStorage.removeItem(LEGACY_KEY);
}

export function addInstance(input: Omit<Instance, "id">): Instance {
	const store = loadStore();
	const inst: Instance = { id: newId(), ...input };
	const next: InstanceStore = {
		instances: [...store.instances, inst],
		activeId: store.activeId ?? inst.id,
	};
	saveStore(next);
	return inst;
}

export function updateInstance(id: string, patch: Partial<Omit<Instance, "id">>): void {
	const store = loadStore();
	const idx = store.instances.findIndex((i) => i.id === id);
	if (idx < 0) return;
	store.instances[idx] = { ...store.instances[idx], ...patch };
	saveStore(store);
}

export function deleteInstance(id: string): void {
	const store = loadStore();
	const remaining = store.instances.filter((i) => i.id !== id);
	const activeId = store.activeId === id ? (remaining[0]?.id ?? null) : store.activeId;
	saveStore({ instances: remaining, activeId });
}

export function setActiveInstance(id: string): void {
	const store = loadStore();
	if (!store.instances.some((i) => i.id === id)) return;
	saveStore({ ...store, activeId: id });
}

export type HealthStatus = "ok" | "auth-required" | "unreachable" | "checking";

export async function checkConnection(
	baseUrl: string,
	token?: string,
	timeoutMs: number = CONNECTION_TIMEOUT_MS,
): Promise<{ status: HealthStatus; message: string }> {
	try {
		const { baseUrl: base, headers, fetch } = dispatchFor({ baseUrl, token });
		const res = await fetch(`${base}/v3/workspaces/list`, {
			method: "POST",
			headers,
			body: JSON.stringify({}),
			signal: AbortSignal.timeout(timeoutMs),
		});

		const reject = res.headers.get(PROXY_REJECT_HEADER);
		if (reject) {
			return { status: "unreachable", message: `Proxy refused upstream (${reject})` };
		}
		if (res.ok) return { status: "ok", message: "Connected successfully" };
		if (res.status === 401 || res.status === 403) {
			return { status: "auth-required", message: "Authentication required — provide an API token" };
		}
		return { status: "unreachable", message: `Server returned ${res.status}` };
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error";
		if (msg.includes("AbortError") || msg.includes("timeout")) {
			return { status: "unreachable", message: "Connection timed out" };
		}
		return { status: "unreachable", message: `Cannot reach server: ${msg}` };
	}
}
