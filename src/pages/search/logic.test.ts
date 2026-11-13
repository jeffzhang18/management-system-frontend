import { describe, expect, it } from "vitest";
import {
	canSubmit,
	bookmarkGrid,
	defaults,
	errorMessage,
	metadataCurrent,
	move,
	SearchAttempt,
	safeIcon,
	settingsPatch,
	validUrl,
	normalizeWebsiteUrl,
	validGradient,
	lightGradient,
} from "./logic";

describe("search page logic", () => {
	it("normalizes bare website hosts without relaxing image validation", () => {
		expect(normalizeWebsiteUrl(" bing.com ")).toBe("https://bing.com/");
		expect(normalizeWebsiteUrl("www.bing.com/search?q=a%20b")).toBe("https://www.bing.com/search?q=a%20b");
		expect(normalizeWebsiteUrl("http://example.com/path?a=1#hash")).toBe("http://example.com/path?a=1#hash");
		expect(normalizeWebsiteUrl("http://intranet:8080")).toBe("http://intranet:8080/");
		expect(normalizeWebsiteUrl("bing.com:8443/path")).toBe("https://bing.com:8443/path");
		for (const value of [
			"",
			"not a url",
			"hello",
			"javascript:alert(1)",
			"data:text/html,a",
			"ftp://a.com",
			"//bing.com",
			"https://user:pass@bing.com",
			"https:bing.com",
		]) {
			expect(normalizeWebsiteUrl(value)).toBeNull();
		}
		expect(validUrl("bing.com/icon.png", true)).toBeNull();
	});

	it("fits row and column layouts to container width including editing controls", () => {
		const settings = { ...defaults, iconSize: 112, gap: 48, itemsPerLine: 12 };
		for (const width of [288, 351, 366, 406, 440, 720, 960, 1280]) {
			for (const mobile of [true, false]) {
				for (const editing of [true, false]) {
					for (const direction of ["row", "column"] as const) {
						const grid = bookmarkGrid(width, 27, { ...settings, layoutDirection: direction }, mobile, editing);
						expect(grid.columns * grid.cell + (grid.columns - 1) * grid.gap).toBeLessThanOrEqual(width);
						if (grid.column) expect(grid.columns * grid.rows!).toBeGreaterThanOrEqual(27);
						if (mobile) expect(grid.column).toBe(false);
					}
				}
			}
		}
		expect(bookmarkGrid(900, 3, defaults, false, false).columns).toBe(3);
	});
	it("preserves grid geometry when bookmark organization is toggled", () => {
		for (const width of [288, 351, 406, 720, 960, 1280]) {
			for (const mobile of [true, false]) {
				for (const direction of ["row", "column"] as const) {
					for (const iconSize of [40, 72, 112]) {
						const settings = { ...defaults, iconSize, layoutDirection: direction, gap: 48, itemsPerLine: 12 };
						expect(bookmarkGrid(width, 27, settings, mobile, true)).toEqual(
							bookmarkGrid(width, 27, settings, mobile, false),
						);
					}
				}
			}
		}
	});

	it("validates gradients and chooses a foreground for bright and dark colors", () => {
		expect(validGradient(defaults)).toBe(true);
		expect(validGradient({ ...defaults, gradientFrom: "red" })).toBe(false);
		expect(validGradient({ ...defaults, gradientAngle: 360 })).toBe(false);
		expect(validGradient({ ...defaults, gradientAngle: 0.5 })).toBe(false);
		expect(lightGradient(defaults)).toBe(false);
		expect(lightGradient({ ...defaults, gradientFrom: "#ffffff", gradientTo: "#e8f0ff" })).toBe(true);
	});
	it("accepts only credential-free HTTP(S) links and HTTPS images", () => {
		expect(validUrl(" https://example.com ")).toBe("https://example.com/");
		expect(validUrl("http://example.com")).toBe("http://example.com/");
		expect(validUrl("http://example.com/a.png", true)).toBeNull();
		expect(validUrl("https://user:pass@example.com")).toBeNull();
		expect(validUrl("javascript:alert(1)")).toBeNull();
		expect(validUrl("not a url")).toBeNull();
		expect(validUrl(`https://example.com/${"a".repeat(2048)}`)).toBeNull();
		expect(safeIcon(null)).toBeNull();
		expect(safeIcon("https://example.com/icon.png")).toBe("https://example.com/icon.png");
	});

	it("blocks empty, oversized, composing and duplicate submissions", () => {
		expect(canSubmit("  query ", false, false)).toBe(true);
		expect(canSubmit("   ", false, false)).toBe(false);
		expect(canSubmit("a".repeat(1001), false, false)).toBe(false);
		expect(canSubmit("query", true, false)).toBe(false);
		expect(canSubmit("query", false, true)).toBe(false);
	});

	it("reuses request IDs only for retries of the same search", () => {
		let counter = 0;
		const create = () => `id-${++counter}`;
		const attempts = new SearchAttempt();
		expect(attempts.get("q", "google", false, create)).toBe("id-1");
		expect(attempts.get("q", "google", true, create)).toBe("id-1");
		expect(attempts.get("q", "google", false, create)).toBe("id-2");
		expect(attempts.get("q", "bing", true, create)).toBe("id-3");
	});

	it("moves items without mutating the source", () => {
		const items = ["a", "b", "c"];
		expect(move(items, 0, 2)).toEqual(["b", "c", "a"]);
		expect(move(items, 2, 0)).toEqual(["c", "a", "b"]);
		expect(move(items, 0, 5)).toEqual(items);
		expect(items).toEqual(["a", "b", "c"]);
	});

	it("ignores stale metadata responses", () => {
		expect(metadataCurrent(2, 2, "https://a.com", "https://a.com")).toBe(true);
		expect(metadataCurrent(1, 2, "https://a.com", "https://a.com")).toBe(false);
		expect(metadataCurrent(2, 2, "https://a.com", "https://b.com")).toBe(false);
	});

	it("sends only changed settings with the base version", () => {
		const original = { ...defaults, version: 3 };
		expect(settingsPatch(original, { ...original })).toEqual({ version: 3 });
		expect(settingsPatch(original, { ...original, gap: 32, wallpaperUrl: "  " })).toEqual({ version: 3, gap: 32 });
		expect(
			settingsPatch(original, { ...original, backgroundMode: "gradient", gradientFrom: "#abcdef", gradientAngle: 90 }),
		).toEqual({
			version: 3,
			backgroundMode: "gradient",
			gradientFrom: "#abcdef",
			gradientAngle: 90,
		});
		expect(
			settingsPatch(original, {
				...defaults,
				version: 0,
				backgroundMode: "online",
				wallpaperUrl: "https://a.com/w.jpg",
			}),
		).toEqual({ version: 3, backgroundMode: "online", wallpaperUrl: "https://a.com/w.jpg" });
	});

	it("maps version conflicts to the conflict message", () => {
		expect(errorMessage({ response: { status: 409 } }, "failed", "conflict")).toBe("conflict");
		expect(errorMessage({ response: { status: 400 } }, "failed", "conflict")).toBe("failed");
		expect(errorMessage(new Error("offline"), "failed", "conflict")).toBe("failed");
	});
});
