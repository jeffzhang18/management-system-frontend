const RELOAD_KEY = "app:chunk-reload-at";
const RETRY_AFTER_MS = 5 * 60 * 1000;

export function isChunkLoadError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading chunk .+ failed/i.test(
		error.message,
	);
}

export function recoverChunkLoad({
	storage,
	reload,
	now = Date.now,
}: {
	storage: Pick<Storage, "getItem" | "setItem">;
	reload: () => void;
	now?: () => number;
}): boolean {
	try {
		const timestamp = now();
		const previous = Number(storage.getItem(RELOAD_KEY));
		if (previous > 0 && timestamp - previous < RETRY_AFTER_MS) return false;
		// Persist before navigation so a persistent network error cannot cause a reload loop.
		storage.setItem(RELOAD_KEY, String(timestamp));
		reload();
		return true;
	} catch {
		// If storage is unavailable, leave the error visible with a manual retry button.
		return false;
	}
}

export function registerChunkRecovery() {
	window.addEventListener("vite:preloadError", (event) => {
		if (!navigator.onLine) return;
		try {
			if (recoverChunkLoad({ storage: sessionStorage, reload: () => window.location.reload() })) {
				event.preventDefault();
			}
		} catch {
			// Accessing sessionStorage itself may be denied by browser policy.
		}
	});
}
