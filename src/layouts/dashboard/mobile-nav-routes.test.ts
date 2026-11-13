import { describe, expect, it } from "vitest";
import { mobileNavIndex } from "./mobile-nav-routes";

describe("mobile navigation routes", () => {
	it.each([
		["/search", 0],
		["/weather", 1],
		["/record", 2],
		["/record/day/2026-11-13", 2],
		["/record/detail/123", 2],
		["/subscriptions", 3],
		["/recording", -1],
		["/workbench", -1],
	])("selects the correct tab for %s", (path, index) => {
		expect(mobileNavIndex(path)).toBe(index);
	});
});
