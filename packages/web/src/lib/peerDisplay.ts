/**
 * Resolve a peer's friendly display name from its metadata, falling back to the
 * raw peer id. Honcho peers are keyed by opaque ids (WhatsApp `…-lid`, UUIDs);
 * a `display_name` metadata key lets the UI show something human-readable.
 */
export const DISPLAY_NAME_KEY = "display_name";

export function peerDisplayName(
	metadata: Record<string, unknown> | null | undefined,
	fallbackId: string,
): string {
	const value = metadata?.[DISPLAY_NAME_KEY];
	if (typeof value === "string" && value.trim().length > 0) {
		return value.trim();
	}
	return fallbackId;
}

/** Whether a peer has an explicit display name distinct from its id. */
export function hasDisplayName(
	metadata: Record<string, unknown> | null | undefined,
	peerId: string,
): boolean {
	return peerDisplayName(metadata, peerId) !== peerId;
}
