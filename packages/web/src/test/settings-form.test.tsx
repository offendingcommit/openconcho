import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { HONCHO_CLOUD_URL, loadStore } from "@/lib/config";

function renderForm(ui: React.ReactElement) {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SettingsForm — cloud preset", () => {
	it("does not render the editable Base URL input", () => {
		renderForm(<SettingsForm instance={null} preset="cloud" />);
		expect(screen.queryByPlaceholderText("http://localhost:8000")).not.toBeInTheDocument();
	});

	it("marks the API key as required", () => {
		renderForm(<SettingsForm instance={null} preset="cloud" />);
		expect(screen.getByText("required")).toBeInTheDocument();
	});

	it("blocks save when the API key is empty", async () => {
		const onSaved = vi.fn();
		const user = userEvent.setup();
		renderForm(<SettingsForm instance={null} preset="cloud" onSaved={onSaved} />);
		await user.click(screen.getByRole("button", { name: /Connect to Honcho Cloud/i }));
		expect(screen.getByText(/API key is required for Honcho Cloud/i)).toBeInTheDocument();
	});

	it("saves with the Honcho Cloud URL when a token is provided", async () => {
		const user = userEvent.setup();
		renderForm(<SettingsForm instance={null} preset="cloud" />);
		await user.type(screen.getByPlaceholderText(/Paste your Honcho Cloud API key/i), "sk-test-1");
		await user.click(screen.getByRole("button", { name: /Connect to Honcho Cloud/i }));
		const store = loadStore();
		expect(store.instances[0]?.baseUrl).toBe(HONCHO_CLOUD_URL);
	});
});

describe("SettingsForm — self-hosted preset", () => {
	it("renders the editable Base URL input", () => {
		renderForm(<SettingsForm instance={null} preset="self-hosted" />);
		expect(screen.getByPlaceholderText("http://localhost:8000")).toBeInTheDocument();
	});

	it("allows saving without a token", async () => {
		const user = userEvent.setup();
		renderForm(<SettingsForm instance={null} preset="self-hosted" />);
		await user.click(screen.getByRole("button", { name: /Add Instance/i }));
		const store = loadStore();
		expect(store.instances).toHaveLength(1);
	});

	it("blocks saving a token for a non-localhost HTTP endpoint", async () => {
		const user = userEvent.setup();
		renderForm(<SettingsForm instance={null} preset="self-hosted" />);
		const baseUrl = screen.getByPlaceholderText("http://localhost:8000");
		await user.clear(baseUrl);
		await user.type(baseUrl, "http://100.67.206.76:8000");
		await user.type(
			screen.getByPlaceholderText(/required only if your instance has auth enabled/i),
			"secret-token",
		);
		await user.click(screen.getByRole("button", { name: /Add Instance/i }));

		expect(
			screen.getByText(/API tokens require HTTPS unless connecting to localhost/i),
		).toBeInTheDocument();
		expect(loadStore().instances).toHaveLength(0);
	});
});

describe("SettingsForm — edit mode auto-detects cloud", () => {
	it("renders the cloud variant when editing an instance with the cloud URL", () => {
		renderForm(
			<SettingsForm
				instance={{
					id: "id-1",
					name: "My Cloud",
					baseUrl: HONCHO_CLOUD_URL,
					token: "sk-existing",
				}}
			/>,
		);
		expect(screen.queryByPlaceholderText("http://localhost:8000")).not.toBeInTheDocument();
		expect(screen.getByText("required")).toBeInTheDocument();
	});
});
