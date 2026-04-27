import { z } from "zod";
import { httpFetch } from "@/lib/http";

const CONFIG_KEY = "openconcho:config";

export const configSchema = z.object({
	baseUrl: z.string().url({ message: "Must be a valid URL" }),
	token: z.string().optional().default(""),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config | null {
	try {
		const raw = localStorage.getItem(CONFIG_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return configSchema.parse(parsed);
	} catch {
		return null;
	}
}

export function saveConfig(config: Config): void {
	localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
	localStorage.removeItem(CONFIG_KEY);
}

export type HealthStatus = "ok" | "auth-required" | "unreachable" | "checking";

export async function checkConnection(
	baseUrl: string,
	token?: string,
): Promise<{
	status: HealthStatus;
	message: string;
}> {
	try {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (token) headers.Authorization = `Bearer ${token}`;

		const res = await httpFetch(`${baseUrl}/v3/workspaces/list`, {
			method: "POST",
			headers,
			body: JSON.stringify({}),
			signal: AbortSignal.timeout(5000),
		});

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
