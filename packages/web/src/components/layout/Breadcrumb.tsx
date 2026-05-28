import { Link, useRouter } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useDemo } from "@/hooks/useDemo";

const SECTION_LABELS: Record<string, string> = {
	peers: "Peers",
	sessions: "Sessions",
	conclusions: "Conclusions",
	dreams: "Dreams",
	webhooks: "Webhooks",
	chat: "Chat",
};

const KNOWN_SECTIONS = new Set(Object.keys(SECTION_LABELS));

type Segment = { label: string; href: string | null; mono?: boolean };

function buildSegments(
	pathname: string,
	mask: (v: string) => string,
	labels: Record<string, string>,
): Segment[] {
	if (!pathname.startsWith("/workspaces")) return [];

	const rest = pathname.slice("/workspaces".length); // "" | "/wid" | "/wid/peers" | ...

	if (!rest) return [{ label: "Workspaces", href: null }];

	const parts = rest.slice(1).split("/"); // ["wid"] | ["wid", "peers"] | ...
	const wid = parts[0];
	if (!wid) return [{ label: "Workspaces", href: null }];

	const segments: Segment[] = [{ label: "Workspaces", href: "/workspaces" }];

	if (parts.length === 1) {
		segments.push({ label: mask(wid), href: null, mono: true });
		return segments;
	}
	segments.push({ label: mask(wid), href: `/workspaces/${wid}`, mono: true });

	const section = parts[1];
	if (!section || !KNOWN_SECTIONS.has(section)) return segments;

	if (parts.length === 2) {
		segments.push({ label: SECTION_LABELS[section], href: null });
		return segments;
	}
	segments.push({ label: SECTION_LABELS[section], href: `/workspaces/${wid}/${section}` });

	const subId = parts[2];
	if (!subId) return segments;

	// A friendly label override (e.g. a peer's display_name) renders in place of
	// the raw id and drops the mono styling reserved for ids.
	const override = labels[subId];
	const subLabel = mask(override ?? subId);
	const subMono = override === undefined;

	if (parts.length === 3) {
		segments.push({ label: subLabel, href: null, mono: subMono });
		return segments;
	}
	segments.push({
		label: subLabel,
		href: `/workspaces/${wid}/${section}/${subId}`,
		mono: subMono,
	});

	const subSection = parts[3];
	if (subSection && SECTION_LABELS[subSection]) {
		segments.push({ label: SECTION_LABELS[subSection], href: null });
	}

	return segments;
}

export function Breadcrumb({ labels = {} }: { labels?: Record<string, string> } = {}) {
	const { state } = useRouter();
	const { mask } = useDemo();
	const segments = buildSegments(state.location.pathname, mask, labels);

	if (segments.length <= 1) return null;

	return (
		<nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-4 flex-wrap">
			{segments.map((seg, i) => (
				<span key={i} className="flex items-center gap-1">
					{i > 0 && (
						<ChevronRight
							className="w-3 h-3 shrink-0"
							style={{ color: "var(--text-4)" }}
							strokeWidth={2}
						/>
					)}
					{seg.href ? (
						<Link
							to={seg.href as never}
							className={`text-xs transition-colors hover:text-[color:var(--accent-text)] ${seg.mono ? "font-mono" : ""}`}
							style={{ color: "var(--text-3)" }}
						>
							{seg.label}
						</Link>
					) : (
						<span
							className={`text-xs font-medium ${seg.mono ? "font-mono" : ""}`}
							style={{ color: "var(--text-2)" }}
						>
							{seg.label}
						</span>
					)}
				</span>
			))}
		</nav>
	);
}
