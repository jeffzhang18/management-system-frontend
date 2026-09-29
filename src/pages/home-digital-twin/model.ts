import { z } from "zod";

const coordinate = z.number().finite().min(0).max(20);
const point = z.object({ x: coordinate, y: coordinate });
export const kinds = ["sofa", "bed", "table", "light", "socket", "ac", "sensor"] as const;
export type Kind = (typeof kinds)[number];
export const labels: Record<Kind, string> = {
	sofa: "沙发",
	bed: "床",
	table: "餐桌",
	light: "灯光",
	socket: "插座",
	ac: "空调",
	sensor: "温湿度计",
};
const wallSchema = z.object({
	id: z.string(),
	a: point,
	b: point,
	height: z.number().min(1).max(6),
	thickness: z.number().min(0.05).max(1),
});
const itemSchema = z.object({
	id: z.string(),
	kind: z.enum(kinds),
	name: z.string().max(80),
	x: coordinate,
	y: coordinate,
	rotation: z.number().finite(),
	on: z.boolean(),
	online: z.boolean(),
	value: z.number().min(0).max(100),
	binding: z.string().max(200),
});
const openingSchema = z.object({
	id: z.string(),
	wallId: z.string(),
	kind: z.enum(["door", "window"]),
	offset: z.number().min(0).max(1),
	width: z.number().min(0.3).max(3),
});
export const planSchema = z
	.object({
		version: z.literal(1),
		name: z.string().min(1).max(80),
		walls: z.array(wallSchema).max(500),
		items: z.array(itemSchema).max(500),
		openings: z.array(openingSchema).max(500),
	})
	.superRefine((p, ctx) => {
		const ids = [...p.walls, ...p.items, ...p.openings].map((o) => o.id);
		if (
			new Set(ids).size !== ids.length ||
			p.walls.some((w) => length(w) < 0.1) ||
			p.openings.some((o) => !p.walls.some((w) => w.id === o.wallId))
		)
			ctx.addIssue({ code: "custom", message: "模型包含重复标识、无效墙体或门窗引用" });
	});
export type Plan = z.infer<typeof planSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Point = z.infer<typeof point>;
export const id = () => crypto.randomUUID();
export const length = (w: Wall) => Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
export const isDevice = (kind: Kind) => ["light", "socket", "ac", "sensor"].includes(kind);
export function newItem(kind: Kind, p: Point): Item {
	return {
		id: id(),
		kind,
		name: labels[kind],
		...p,
		rotation: 0,
		on: false,
		online: true,
		value: kind === "ac" ? 24 : 70,
		binding: "",
	};
}
export const blankPlan = (): Plan => ({ version: 1, name: "我的家", walls: [], items: [], openings: [] });
export function demoPlan(): Plan {
	const points = [
		[2, 2, 12, 2],
		[12, 2, 12, 10],
		[12, 10, 2, 10],
		[2, 10, 2, 2],
		[8, 2, 8, 10],
		[8, 6, 12, 6],
	];
	const walls = points.map(([x, y, u, v]) => ({
		id: id(),
		a: { x, y },
		b: { x: u, y: v },
		height: 2.8,
		thickness: 0.18,
	}));
	return {
		version: 1,
		name: "林间公寓",
		walls,
		openings: [
			{ id: id(), wallId: walls[4].id, kind: "door", offset: 0.65, width: 0.9 },
			{ id: id(), wallId: walls[0].id, kind: "window", offset: 0.3, width: 1.8 },
		],
		items: [
			newItem("sofa", { x: 4, y: 4 }),
			newItem("table", { x: 5, y: 7 }),
			newItem("bed", { x: 10, y: 4 }),
			{ ...newItem("light", { x: 5, y: 5 }), on: true },
			newItem("ac", { x: 10, y: 2.4 }),
			newItem("socket", { x: 7.5, y: 7 }),
			newItem("sensor", { x: 10, y: 8 }),
		],
	};
}
export interface DeviceAdapter {
	command(device: Item, patch: Partial<Pick<Item, "on" | "value">>): Promise<Partial<Item>>;
}
export const mockAdapter: DeviceAdapter = {
	async command(device, patch) {
		await new Promise((r) => setTimeout(r, 350));
		if (!device.online) throw new Error("设备离线，无法发送指令");
		if (device.kind === "sensor") throw new Error("传感器只支持读取");
		return patch;
	},
};
