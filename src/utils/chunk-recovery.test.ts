import { afterEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, recoverChunkLoad, registerChunkRecovery } from "./chunk-recovery";

describe("chunk loading recovery", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reloads on Vite's real event and lets a repeated failure reach the error boundary", () => {
		const target = new EventTarget();
		const reload = vi.fn();
		Object.assign(target, { location: { reload } });
		let timestamp: string | null = null;
		vi.stubGlobal("window", target);
		vi.stubGlobal("navigator", { onLine: true });
		vi.stubGlobal("sessionStorage", {
			getItem: () => timestamp,
			setItem: (_key: string, value: string) => {
				timestamp = value;
			},
		});
		registerChunkRecovery();
		const first = new Event("vite:preloadError", { cancelable: true });
		target.dispatchEvent(first);
		expect(first.defaultPrevented).toBe(true);
		const second = new Event("vite:preloadError", { cancelable: true });
		target.dispatchEvent(second);
		expect(second.defaultPrevented).toBe(false);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("leaves an offline failure visible without reloading", () => {
		const target = new EventTarget();
		const reload = vi.fn();
		Object.assign(target, { location: { reload } });
		vi.stubGlobal("window", target);
		vi.stubGlobal("navigator", { onLine: false });
		registerChunkRecovery();
		const event = new Event("vite:preloadError", { cancelable: true });
		target.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});
	it("recognizes supported browser import failures without masking application errors", () => {
		for (const message of [
			"Failed to fetch dynamically imported module: https://example.com/assets/old.js",
			"error loading dynamically imported module: https://example.com/assets/old.js",
			"Importing a module script failed.",
			"Unable to preload CSS for /assets/old.css",
		])
			expect(isChunkLoadError(new TypeError(message))).toBe(true);
		expect(isChunkLoadError(new TypeError("Cannot read properties of undefined"))).toBe(false);
		expect(isChunkLoadError(null)).toBe(false);
	});

	it("persists the retry before reloading and prevents a loop across page loads", () => {
		const values = new Map<string, string>();
		const storage = {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
		};
		const reload = vi.fn(() => expect(values.size).toBe(1));
		expect(recoverChunkLoad({ storage, reload, now: () => 10000 })).toBe(true);
		expect(recoverChunkLoad({ storage, reload, now: () => 11000 })).toBe(false);
		expect(reload).toHaveBeenCalledTimes(1);
		expect(recoverChunkLoad({ storage, reload, now: () => 310000 })).toBe(true);
	});

	it("does not auto-reload if the browser cannot persist its retry guard", () => {
		const storage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("Storage denied");
			},
		};
		const reload = vi.fn();
		expect(recoverChunkLoad({ storage, reload })).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});
});
