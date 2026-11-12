import { describe, expect, it, vi } from "vitest";
import { recordThenNavigate } from "./submission";
const result = { historyId: "1", targetUrl: "https://www.google.com/search?q=test", createdAt: "2026-11-11" };
function popup() {
	return { closed: false, close: vi.fn(), location: { replace: vi.fn() } };
}
describe("record before navigation", () => {
	it("does not navigate until persistence resolves", async () => {
		let resolve!: (r: typeof result) => void;
		const saved = new Promise<typeof result>((r) => {
			resolve = r;
		});
		const window = popup();
		const navigate = vi.fn();
		const work = recordThenNavigate({ record: () => saved, popup: window, newTab: true, navigate, active: () => true });
		expect(window.location.replace).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
		resolve(result);
		await work;
		expect(window.location.replace).toHaveBeenCalledWith(result.targetUrl);
	});
	it("closes a reserved window on failure without navigation", async () => {
		const window = popup();
		const navigate = vi.fn();
		await expect(
			recordThenNavigate({
				record: async () => {
					throw new Error("offline");
				},
				popup: window,
				newTab: true,
				navigate,
				active: () => true,
			}),
		).rejects.toThrow("offline");
		expect(window.close).toHaveBeenCalledOnce();
		expect(navigate).not.toHaveBeenCalled();
		expect(window.location.replace).not.toHaveBeenCalled();
	});
	it("returns the recorded destination when a popup is blocked or closed", async () => {
		for (const window of [null, { ...popup(), closed: true }]) {
			const record = vi.fn(async () => result);
			const target = await recordThenNavigate({
				record,
				popup: window,
				newTab: true,
				navigate: vi.fn(),
				active: () => true,
			});
			expect(target).toBe(result.targetUrl);
			expect(record).toHaveBeenCalledOnce();
		}
	});
	it("uses same-tab navigation only after success", async () => {
		const navigate = vi.fn();
		await recordThenNavigate({ record: async () => result, popup: null, newTab: false, navigate, active: () => true });
		expect(navigate).toHaveBeenCalledWith(result.targetUrl);
	});
	it("closes a pending window if the user leaves or switches account", async () => {
		const window = popup();
		await recordThenNavigate({
			record: async () => result,
			popup: window,
			newTab: true,
			navigate: vi.fn(),
			active: () => false,
		});
		expect(window.close).toHaveBeenCalledOnce();
		expect(window.location.replace).not.toHaveBeenCalled();
	});
	it("rejects invalid destinations and closes the placeholder", async () => {
		const window = popup();
		await expect(
			recordThenNavigate({
				record: async () => ({ ...result, targetUrl: "javascript:alert(1)" }),
				popup: window,
				newTab: true,
				navigate: vi.fn(),
				active: () => true,
			}),
		).rejects.toThrow();
		expect(window.close).toHaveBeenCalledOnce();
	});
});
