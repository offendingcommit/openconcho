import createClient from "openapi-fetch";
import type { paths } from "./schema.d.ts";
import { loadConfig } from "@/lib/config";

export function createHonchoClient() {
	const config = loadConfig();
	const baseUrl = config?.baseUrl ?? "http://localhost:8000";
	const token = config?.token ?? "";

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	return createClient<paths>({ baseUrl, headers });
}

export const client = {
	get current() {
		return createHonchoClient();
	},
};
