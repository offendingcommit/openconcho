import { describe, expect, it } from "vitest";
import {
	isHttpOrHttpsUrl,
	isSafeExternalUrl,
	isSecureTokenTransport,
	tokenTransportError,
} from "@/lib/security";

describe("security URL helpers", () => {
	it("only allows http and https URLs for external OS opens", () => {
		expect(isSafeExternalUrl("https://example.com/webhook")).toBe(true);
		expect(isSafeExternalUrl("http://localhost:3000/webhook")).toBe(true);
		expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
		expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
		expect(isSafeExternalUrl("openconcho://settings")).toBe(false);
	});

	it("only accepts http and https webhook endpoints", () => {
		expect(isHttpOrHttpsUrl("https://hooks.example.com/a")).toBe(true);
		expect(isHttpOrHttpsUrl("http://hooks.example.com/a")).toBe(true);
		expect(isHttpOrHttpsUrl("ftp://hooks.example.com/a")).toBe(false);
		expect(isHttpOrHttpsUrl("notaurl")).toBe(false);
	});

	it("requires HTTPS before sending tokens to non-loopback hosts", () => {
		expect(isSecureTokenTransport("https://honcho.example.com")).toBe(true);
		expect(isSecureTokenTransport("http://localhost:8000")).toBe(true);
		expect(isSecureTokenTransport("http://127.0.0.1:8000")).toBe(true);
		expect(isSecureTokenTransport("http://192.168.1.50:8000")).toBe(false);
		expect(isSecureTokenTransport("http://100.67.206.76:8000")).toBe(false);
	});

	it("returns a user-facing error for insecure token transport", () => {
		expect(tokenTransportError("http://100.67.206.76:8000")).toMatch(/HTTPS/);
		expect(tokenTransportError("https://honcho.example.com")).toBeNull();
	});
});
