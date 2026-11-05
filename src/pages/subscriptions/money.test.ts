import { describe, expect, it } from "vitest";
import type { RateSnapshot } from "@/api/services/subscriptionService";
import { convertAmount, formatMoney } from "./money";

const rates: RateSnapshot = {
	base: "USD",
	rates: { USD: 1, CNY: 7, AUD: 1.5 },
	rateDate: "2026-11-03",
	fetchedAt: "2026-11-04T00:00:00Z",
	source: "Frankfurter",
	stale: false,
	available: true,
};
describe("subscription currency display", () => {
	it("converts between each supported currency without modifying the original", () => {
		expect(convertAmount("20.00", "USD", "CNY", rates)).toBe("140.00");
		expect(convertAmount("20.00", "USD", "AUD", rates)).toBe("30.00");
		expect(convertAmount("140.00", "CNY", "USD", rates)).toBe("20.00");
		expect(convertAmount("140.00", "CNY", "AUD", rates)).toBe("30.00");
		expect(convertAmount("30.00", "AUD", "CNY", rates)).toBe("140.00");
		expect(convertAmount("30.00", "AUD", "USD", rates)).toBe("20.00");
	});
	it("rounds only the final converted value", () => {
		expect(convertAmount("1.00", "AUD", "USD", rates)).toBe("0.67");
		expect(convertAmount("999999999999.99", "USD", "CNY", rates)).toBe("6999999999999.93");
	});
	it("handles zero, same-currency, unavailable, and stale rates", () => {
		expect(convertAmount("0.00", "USD", "CNY")).toBe("0.00");
		expect(convertAmount("20.00", "USD", "USD")).toBe("20.00");
		expect(convertAmount("20.00", "USD", "CNY")).toBeNull();
		expect(convertAmount("20.00", "USD", "CNY", { ...rates, stale: true })).toBe("140.00");
		expect(formatMoney(null, "CNY", "zh_CN")).toBe("—");
		expect(formatMoney("20.00", "USD", "en_US")).toContain("20.00");
	});
});
