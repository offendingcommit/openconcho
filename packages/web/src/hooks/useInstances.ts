import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import {
	addInstance as addInstanceCore,
	deleteInstance as deleteInstanceCore,
	type Instance,
	type InstanceStore,
	loadStore,
	setActiveInstance as setActiveInstanceCore,
	updateInstance as updateInstanceCore,
} from "@/lib/config";

const EVENT = "openconcho:instances-changed";

function emit() {
	window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
	window.addEventListener(EVENT, cb);
	window.addEventListener("storage", cb);
	return () => {
		window.removeEventListener(EVENT, cb);
		window.removeEventListener("storage", cb);
	};
}

let cachedKey = "";
let cachedSnapshot: InstanceStore = { instances: [], activeId: null };

function getSnapshot(): InstanceStore {
	const next = loadStore();
	const key = JSON.stringify(next);
	if (key !== cachedKey) {
		cachedKey = key;
		cachedSnapshot = next;
	}
	return cachedSnapshot;
}

function getServerSnapshot(): InstanceStore {
	return cachedSnapshot;
}

export function useInstances() {
	const qc = useQueryClient();

	const store = useSyncExternalStore<InstanceStore>(subscribe, getSnapshot, getServerSnapshot);

	const add = useCallback((input: Omit<Instance, "id">) => {
		const inst = addInstanceCore(input);
		emit();
		return inst;
	}, []);

	const update = useCallback((id: string, patch: Partial<Omit<Instance, "id">>) => {
		updateInstanceCore(id, patch);
		emit();
	}, []);

	const remove = useCallback(
		(id: string) => {
			deleteInstanceCore(id);
			qc.clear();
			emit();
		},
		[qc],
	);

	const activate = useCallback(
		(id: string) => {
			setActiveInstanceCore(id);
			qc.clear();
			emit();
		},
		[qc],
	);

	const active = store.instances.find((i) => i.id === store.activeId) ?? null;

	return {
		instances: store.instances,
		activeId: store.activeId,
		active,
		add,
		update,
		remove,
		activate,
	};
}
