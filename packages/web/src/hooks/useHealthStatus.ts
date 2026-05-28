import { useQuery } from "@tanstack/react-query";
import { useInstances } from "@/hooks/useInstances";
import { checkConnection } from "@/lib/config";

const POLL_INTERVAL_MS = 30_000;

export function useHealthStatus() {
	const { active } = useInstances();
	return useQuery({
		queryKey: ["health", active?.id, active?.baseUrl, Boolean(active?.token)],
		queryFn: async () => {
			if (!active) throw new Error("No active instance");
			return checkConnection(active.baseUrl, active.token || undefined);
		},
		enabled: !!active,
		refetchInterval: POLL_INTERVAL_MS,
		refetchOnWindowFocus: true,
		staleTime: 0,
	});
}
