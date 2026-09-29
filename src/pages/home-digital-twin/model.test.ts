import { describe, expect, it } from "vitest";
import { blankPlan, demoPlan, length, mockAdapter, newItem, planSchema } from "./model";

describe("home model", () => {
	it("round trips a furnished model with wall references", () => {
		const p = demoPlan();
		expect(planSchema.parse(JSON.parse(JSON.stringify(p)))).toEqual(p);
		expect(length(p.walls[0])).toBe(10);
	});
	it("rejects malformed geometry and dangling openings", () => {
		const p = demoPlan();
		p.walls[0].b = p.walls[0].a;
		expect(planSchema.safeParse(p).success).toBe(false);
		const q = demoPlan();
		q.openings[0].wallId = "missing";
		expect(planSchema.safeParse(q).success).toBe(false);
		expect(
			planSchema.safeParse({ ...blankPlan(), items: [{ ...newItem("light", { x: 1, y: 1 }), x: Infinity }] }).success,
		).toBe(false);
	});
	it("rejects duplicate object identities", () => {
		const p = demoPlan();
		p.items[0].id = p.walls[0].id;
		expect(planSchema.safeParse(p).success).toBe(false);
	});
	it("acknowledges commands and rejects offline devices", async () => {
		const light = newItem("light", { x: 1, y: 1 });
		expect(await mockAdapter.command(light, { on: true })).toEqual({ on: true });
		await expect(mockAdapter.command({ ...light, online: false }, { on: true })).rejects.toThrow("离线");
		await expect(mockAdapter.command({ ...light, kind: "sensor" }, { on: true })).rejects.toThrow("只支持读取");
	});
});
