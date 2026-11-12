import type { Engine, SearchSettings } from "@/api/services/searchService";

export const defaults: SearchSettings = Object.freeze({
	version: 0,
	defaultEngine: "google" as Engine,
	openInNewTab: true,
	backgroundMode: "default" as const,
	wallpaperUrl: null,
	overlayOpacity: 0.3,
	iconSize: 72,
	gap: 24,
	radius: 20,
	layoutDirection: "row" as const,
	itemsPerLine: 8,
});

const MAX_QUERY = 1000;
const MAX_URL = 2048;

/** Returns the normalized URL when it is a credential-free HTTP(S) link, HTTPS only for images. */
export function validUrl(value: unknown, image = false): string | null {
	if (typeof value !== "string" || !value.trim() || value.length > MAX_URL) return null;
	try {
		const url = new URL(value.trim());
		const protocols = image ? ["https:"] : ["https:", "http:"];
		if (!protocols.includes(url.protocol) || !url.hostname || url.username || url.password) return null;
		return url.href.length > MAX_URL ? null : url.href;
	} catch {
		return null;
	}
}

export function safeIcon(value: string | null | undefined): string | null {
	return value ? validUrl(value, true) : null;
}

export function canSubmit(text: string, composing: boolean, submitting: boolean): boolean {
	const query = text.trim();
	return !composing && !submitting && query.length > 0 && query.length <= MAX_QUERY;
}

/** Reuses the request ID only when retrying the same query and engine, so retries stay idempotent. */
export class SearchAttempt {
	private last: { key: string; id: string } | null = null;

	get(query: string, engine: Engine, retry: boolean, create: () => string): string {
		const key = `${engine}\n${query}`;
		if (retry && this.last?.key === key) return this.last.id;
		const id = create();
		this.last = { key, id };
		return id;
	}
}

export function move<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items];
	if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
	const [item] = next.splice(from, 1);
	next.splice(to, 0, item);
	return next;
}

export function metadataCurrent(sequence: number, latest: number, requestedUrl: string, currentUrl: string): boolean {
	return sequence === latest && requestedUrl === currentUrl;
}

const SETTING_KEYS = [
	"defaultEngine",
	"openInNewTab",
	"backgroundMode",
	"wallpaperUrl",
	"overlayOpacity",
	"iconSize",
	"gap",
	"radius",
	"layoutDirection",
	"itemsPerLine",
] as const satisfies readonly (keyof SearchSettings)[];

/** Sends only changed fields together with the version the draft was based on. */
export function settingsPatch(
	original: SearchSettings,
	draft: SearchSettings,
): Partial<SearchSettings> & { version: number } {
	const next = { ...draft, wallpaperUrl: draft.wallpaperUrl?.trim() || null };
	const patch: Partial<SearchSettings> = {};
	for (const key of SETTING_KEYS) {
		if (next[key] !== original[key]) Object.assign(patch, { [key]: next[key] });
	}
	return { ...patch, version: original.version };
}

export function errorMessage(error: unknown, fallback: string, conflict: string): string {
	const status = (error as { response?: { status?: number } } | null)?.response?.status;
	return status === 409 ? conflict : fallback;
}
