import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

const { httpFetch } = vi.hoisted(() => ({ httpFetch: vi.fn() }));
vi.mock("@/lib/http", () => ({ httpFetch }));

const WORKSPACE_ID = "ws-alpha";
const SESSION_ID = "sess-1";
const PEER_ID = "peer-bot";
const INSTANCE = {
	id: "inst-1",
	name: "Local",
	baseUrl: "http://localhost:8000",
	token: "",
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function requestOf(input: Request | string, init?: RequestInit) {
	return typeof input === "string" ? new Request(input, init) : input;
}

function message(content: string) {
	return {
		id: "msg-1",
		content,
		peer_id: PEER_ID,
		session_id: SESSION_ID,
		workspace_id: WORKSPACE_ID,
		created_at: "2026-01-01T00:00:00Z",
		token_count: 12,
	};
}

function mockHoncho(options: { messageContent?: string; chatContent?: string } = {}) {
	httpFetch.mockImplementation(async (input: Request | string, init?: RequestInit) => {
		const req = requestOf(input, init);
		const url = req.url;
		if (url.includes("/messages/list")) {
			return json({
				items: [message(options.messageContent ?? "hello")],
				total: 1,
				page: 1,
				size: 50,
				pages: 1,
			});
		}
		if (url.includes("/chat")) {
			return json({ content: options.chatContent ?? "ok" });
		}
		return json({ items: [], total: 0, page: 1, size: 20, pages: 0 });
	});
}

function renderAt(path: string) {
	saveStore({ instances: [INSTANCE], activeId: INSTANCE.id });
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
	});
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>
			<DemoProvider>
				<MetadataProvider>
					{/* biome-ignore lint/suspicious/noExplicitAny: test router type */}
					<RouterProvider router={router as any} />
				</MetadataProvider>
			</DemoProvider>
		</QueryClientProvider>,
	);
}

function sessionPath() {
	return `/workspaces/${WORKSPACE_ID}/sessions/${SESSION_ID}`;
}

function chatPath() {
	return `/workspaces/${WORKSPACE_ID}/peers/${PEER_ID}/chat`;
}

describe("session message markdown", () => {
	afterEach(() => {
		httpFetch.mockReset();
		localStorage.clear();
	});

	it("renders a heading instead of raw markdown syntax", async () => {
		mockHoncho({ messageContent: "# Status update" });
		renderAt(sessionPath());
		expect(await screen.findByRole("heading", { name: "Status update" })).toBeInTheDocument();
	});

	it("renders a list item from markdown bullets", async () => {
		mockHoncho({ messageContent: "- first item\n- second item" });
		renderAt(sessionPath());
		expect(await screen.findByText("first item")).toBeInTheDocument();
	});

	it("renders fenced code as a code block", async () => {
		mockHoncho({ messageContent: "```\nconst x = 1\n```" });
		renderAt(sessionPath());
		expect(await screen.findByText("const x = 1")).toBeInTheDocument();
	});

	it("renders a GFM table header", async () => {
		mockHoncho({ messageContent: "| Name | Value |\n| --- | --- |\n| alpha | 1 |" });
		renderAt(sessionPath());
		expect(await screen.findByRole("columnheader", { name: "Name" })).toBeInTheDocument();
	});

	it("keeps a plain-text message readable", async () => {
		mockHoncho({ messageContent: "just a normal sentence" });
		renderAt(sessionPath());
		expect(await screen.findByText("just a normal sentence")).toBeInTheDocument();
	});

	it("does not execute raw HTML in message content", async () => {
		mockHoncho({ messageContent: '<script>window.__md_xss = true</script><img src="x" />' });
		renderAt(sessionPath());
		await screen.findByText(/script/i);
		expect(document.querySelector("script")).toBeNull();
	});

	it("does not turn a javascript URL into an executable link", async () => {
		mockHoncho({ messageContent: "[click me](javascript:alert(1))" });
		renderAt(sessionPath());
		await screen.findByText("click me");
		expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
	});

	it("masks private message text in demo mode before rendering", async () => {
		localStorage.setItem("openconcho:demo", "true");
		mockHoncho({ messageContent: "secret-token-value" });
		renderAt(sessionPath());
		await screen.findByText("Session detail");
		expect(screen.queryByText("secret-token-value")).not.toBeInTheDocument();
	});

	it("still shows message token count beside the rendered body", async () => {
		mockHoncho({ messageContent: "**bold** note" });
		renderAt(sessionPath());
		expect(await screen.findByText("12 tokens")).toBeInTheDocument();
	});

	it("keeps a single newline in a plain-text message", async () => {
		mockHoncho({ messageContent: "line one\nline two" });
		renderAt(sessionPath());
		const line = await screen.findByText(/line one/);
		expect(line.querySelector("br")).not.toBeNull();
	});

	it("keeps timestamp lines in source order", async () => {
		mockHoncho({
			messageContent: "[2026-01-01 00:00:00] alpha-ts\n[2026-01-02 00:00:00] beta-ts",
		});
		renderAt(sessionPath());
		await screen.findByText(/alpha-ts/);
		const text = document.body.textContent ?? "";
		expect(text.indexOf("alpha-ts")).toBeLessThan(text.indexOf("beta-ts"));
	});

	it("keeps a nested list nested", async () => {
		mockHoncho({ messageContent: "- outer-md\n   - nested-md" });
		renderAt(sessionPath());
		const nested = await screen.findByText("nested-md");
		expect(nested.closest("li")?.parentElement?.closest("li")).not.toBeNull();
	});

	it("keeps an indented code block as a code block", async () => {
		mockHoncho({ messageContent: "Intro line.\n\n    const indented = 1\n" });
		renderAt(sessionPath());
		expect((await screen.findByText("const indented = 1")).closest("pre")).not.toBeNull();
	});

	it("leaves a bracketed token as literal text", async () => {
		mockHoncho({
			messageContent: "## Contradictions\n\n**CONTRADICTION**: See [abcdefghijklmn] here",
		});
		renderAt(sessionPath());
		expect(await screen.findByText(/abcdefghijklmn/)).toBeInTheDocument();
	});

	it("renders representation-like headings as ordinary headings", async () => {
		mockHoncho({
			messageContent: "## Inductive Observations\n\n**Pattern** [high]: user likes cats",
		});
		renderAt(sessionPath());
		await screen.findByText(/user likes cats/);
		expect(screen.queryByText("high")).toBeNull();
	});
});

describe("chat message markdown", () => {
	afterEach(() => {
		httpFetch.mockReset();
		localStorage.clear();
	});

	it("renders assistant markdown as a heading in chat", async () => {
		const user = userEvent.setup();
		Element.prototype.scrollIntoView = vi.fn();
		mockHoncho({ chatContent: "# Assistant heading" });
		renderAt(chatPath());
		await user.type(await screen.findByPlaceholderText(/Message this peer/i), "hello{Enter}");
		expect(await screen.findByRole("heading", { name: "Assistant heading" })).toBeInTheDocument();
	});

	it("does not override user bubble paragraph color", async () => {
		const user = userEvent.setup();
		Element.prototype.scrollIntoView = vi.fn();
		mockHoncho({ chatContent: "ok" });
		renderAt(chatPath());
		await user.type(
			await screen.findByPlaceholderText(/Message this peer/i),
			"Contrast check{Enter}",
		);
		const text = await screen.findByText("Contrast check");
		const paragraph = text.closest("p") ?? text;
		expect(paragraph.getAttribute("style") ?? "").not.toMatch(/--text-2/);
	});

	it("does not override user bubble list color", async () => {
		const user = userEvent.setup();
		Element.prototype.scrollIntoView = vi.fn();
		mockHoncho({ chatContent: "ok" });
		renderAt(chatPath());
		await user.type(
			await screen.findByPlaceholderText(/Message this peer/i),
			"- bubble-item{Enter}",
		);
		const item = await screen.findByText("bubble-item");
		expect(item.closest("ul")?.getAttribute("style") ?? "").not.toMatch(/--text-2/);
	});
});
