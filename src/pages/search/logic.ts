import type { Engine, SearchSettings } from "@/api/services/searchService";

export const defaults: SearchSettings = Object.freeze({
	version: 0,
	defaultEngine: "google" as Engine,
	openInNewTab: true,
	backgroundMode: "default" as const,
	gradientFrom: "#1e3a8a",
	gradientTo: "#6d28d9",
	gradientAngle: 135,
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

/** Only website entry accepts bare hosts; image validation remains strict. */
export function normalizeWebsiteUrl(value: string): string | null {
	const text = value.trim();
	if (!text || /\s/.test(text)) return null;
	const explicit = /^[a-z][a-z\d+.-]*:/i.test(text) && !/^[a-z\d.-]+:\d+(?:[/?#]|$)/i.test(text);
	const candidate = explicit ? text : `https://${text}`;
	if (!/^https?:\/\//i.test(candidate) || text.startsWith("//")) return null;
	const result = validUrl(candidate);
	if (!result) return null;
	if (explicit) return result;
	const host = new URL(result).hostname;
	return host.includes(".") || host === "localhost" || host.startsWith("[") ? result : null;
}

export function bookmarkGrid(
	width: number,
	total: number,
	settings: SearchSettings,
	mobile: boolean,
	_editing: boolean,
) {
	const icon = mobile ? Math.min(settings.iconSize, 56) : settings.iconSize;
	const gap = mobile ? Math.min(settings.gap, 16) : settings.gap;
	const cell = icon + (mobile ? 16 : 24);
	const capacity = Math.max(1, Math.floor((width + gap) / (cell + gap)));
	const column = !mobile && settings.layoutDirection === "column";
	const rows = column ? Math.max(settings.itemsPerLine, Math.ceil(total / capacity)) : undefined;
	const columns = column
		? Math.max(1, Math.ceil(total / (rows || 1)))
		: Math.max(1, Math.min(capacity, settings.itemsPerLine, total));
	return { icon, gap, cell, rows, columns, column };
}

export function validGradient(settings: SearchSettings) {
	return (
		/^#[\da-f]{6}$/i.test(settings.gradientFrom) &&
		/^#[\da-f]{6}$/i.test(settings.gradientTo) &&
		Number.isInteger(settings.gradientAngle) &&
		settings.gradientAngle >= 0 &&
		settings.gradientAngle <= 359
	);
}

/** WCAG relative luminance lets light gradients use a readable dark foreground. */
export function lightGradient(settings: SearchSettings) {
	const luminance = (hex: string) => {
		const rgb = [1, 3, 5].map((offset) => {
			const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
			return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
		});
		return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
	};
	return Math.min(luminance(settings.gradientFrom), luminance(settings.gradientTo)) > 0.4;
}

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
	return !composing && !submitting && query.length <= MAX_QUERY;
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
	"gradientFrom",
	"gradientTo",
	"gradientAngle",
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
