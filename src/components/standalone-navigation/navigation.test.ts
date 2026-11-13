import { describe, expect, it } from "vitest";
import { standaloneDestination } from "./navigation";

const current = "https://admin.jeffsyd.top/search";
const click = { button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const link = { href: "/workbench", target: "_blank", download: false };

describe("standalone internal link navigation", () => {
	it.each(["/workbench", "/search?engine=google#favorites", "https://admin.jeffsyd.top/settings"])(
		"keeps an internal new-window link in the app: %s",
		(href) => {
			expect(standaloneDestination({ ...link, href }, click, current)).toBe(new URL(href, current).href);
		},
	);

	it.each([
		"https://www.google.com/search?q=test",
		"https://api.jeffsyd.top/",
		"https://admin.jeffsyd.top.example.com/",
		"http://admin.jeffsyd.top/",
		"https://admin.jeffsyd.top:8443/",
		"mailto:test@example.com",
		"javascript:alert(1)",
	])("preserves external and non-HTTP destinations: %s", (href) => {
		expect(standaloneDestination({ ...link, href }, click, current)).toBeNull();
	});

	it.each(["", "_self", "_parent", "_top"])("preserves existing current-window navigation: %s", (target) => {
		expect(standaloneDestination({ ...link, target }, click, current)).toBeNull();
	});

	it.each(["metaKey", "ctrlKey", "shiftKey", "altKey", "defaultPrevented"] as const)(
		"respects modified and handled clicks: %s",
		(key) => {
			expect(standaloneDestination(link, { ...click, [key]: true }, current)).toBeNull();
		},
	);

	it("preserves downloads and non-primary clicks", () => {
		expect(standaloneDestination({ ...link, download: true }, click, current)).toBeNull();
		expect(standaloneDestination(link, { ...click, button: 1 }, current)).toBeNull();
	});
});
