import { describe, expect, it } from "vitest";
import {
	canSubmit,
	defaults,
	errorMessage,
	metadataCurrent,
	move,
	SearchAttempt,
	safeIcon,
	settingsPatch,
	validUrl,
} from "./logic";

describe("search page logic", () => {
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
			settingsPatch(original, { ...defaults, version: 0, backgroundMode: "online", wallpaperUrl: "https://a.com/w.jpg" }),
		).toEqual({ version: 3, backgroundMode: "online", wallpaperUrl: "https://a.com/w.jpg" });
	});

	it("maps version conflicts to the conflict message", () => {
		expect(errorMessage({ response: { status: 409 } }, "failed", "conflict")).toBe("conflict");
		expect(errorMessage({ response: { status: 400 } }, "failed", "conflict")).toBe("failed");
		expect(errorMessage(new Error("offline"), "failed", "conflict")).toBe("failed");
	});
});
