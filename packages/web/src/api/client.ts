import createClient from "openapi-fetch";
import { loadConfig } from "@/lib/config";
import { dispatchFor } from "@/lib/dispatch";
import type { paths } from "./schema.d.ts";

export function createHonchoClient() {
	const config = loadConfig() ?? { baseUrl: "http://localhost:8000", token: "" };
	const { baseUrl, headers, fetch } = dispatchFor(config);
	return createClient<paths>({ baseUrl, headers, fetch });
}

export const client = {
	get current() {
		return createHonchoClient();
	},
};
