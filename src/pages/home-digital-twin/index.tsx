import {
	AirVent,
	BedDouble,
	Box,
	Columns2,
	DoorOpen,
	Download,
	House,
	LayoutGrid,
	Lightbulb,
	MousePointer2,
	PanelsTopLeft,
	PencilRuler,
	Plug,
	Plus,
	Redo2,
	RotateCw,
	Sofa,
	Table2,
	Thermometer,
	Trash2,
	Undo2,
	Upload,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Separator } from "@/ui/separator";
import { Slider } from "@/ui/slider";
import { Switch } from "@/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { cn } from "@/utils";
import Editor from "./editor";
import {
	blankPlan,
	demoPlan,
	type Item,
	isDevice,
	type Kind,
	labels,
	mockAdapter,
	type Plan,
	planSchema,
} from "./model";
import "./style.css";
import { formatHour, type SunConfig, sunriseSunset } from "./sun";

const Scene = lazy(() => import("./scene"));
const KEY = "home-digital-twin-v1";
const icons = {
	sofa: Sofa,
	bed: BedDouble,
	table: Table2,
	light: Lightbulb,
	socket: Plug,
	ac: AirVent,
	sensor: Thermometer,
};
export default function HomeDigitalTwin() {
	const [plan, setPlan] = useState<Plan>(() => {
		try {
			const saved = localStorage.getItem(KEY);
			return saved ? planSchema.parse(JSON.parse(saved)) : blankPlan();
		} catch {
			return blankPlan();
		}
	});
	const [selected, select] = useState<string | null>(null);
	const [tool, setTool] = useState("select");
	const [view, setView] = useState("split");
	const [low, setLow] = useState(false);
	const [time, setTime] = useState(12);
	const [lat, setLat] = useState(31.23);
	const [lon, setLon] = useState(121.47);
	const [tz, setTz] = useState(8);
	const [date, setDate] = useState("2026-09-29");
	const [showSunSettings, setShowSunSettings] = useState(false);
	const [saved, setSaved] = useState(true);
	const [busy, setBusy] = useState<string | null>(null);
	const history = useRef<Plan[]>([]),
		future = useRef<Plan[]>([]),
		input = useRef<HTMLInputElement>(null);
	const current = useRef(plan);
	current.current = plan;
	const [sunYear, sunMonth, sunDay] = date.split("-").map(Number);
	const sunCfg: SunConfig = { lat, lon, tzOffset: tz, year: sunYear || 2026, month: sunMonth || 9, day: sunDay || 29 };
	const dayRange = sunriseSunset(sunCfg);
	const minTime = dayRange ? dayRange.sunrise : 6;
	const maxTime = dayRange ? dayRange.sunset : 18;
	function change(p: Plan, record = true) {
		if (record) history.current.push(current.current);
		if (history.current.length > 100) history.current.shift();
		future.current = [];
		setPlan(p);
	}
	useEffect(() => {
		try {
			localStorage.setItem(KEY, JSON.stringify(plan));
			setSaved(true);
		} catch {
			setSaved(false);
			toast.error("保存失败，请导出模型备份");
		}
	}, [plan]);
	const item = plan.items.find((i) => i.id === selected),
		wall = plan.walls.find((w) => w.id === selected),
		opening = plan.openings.find((o) => o.id === selected);
	const updateItem = (patch: Partial<Item>) =>
		change({ ...plan, items: plan.items.map((i) => (i.id === selected ? { ...i, ...patch } : i)) });
	const remove = () => {
		change({
			...plan,
			items: plan.items.filter((i) => i.id !== selected),
			walls: plan.walls.filter((w) => w.id !== selected),
			openings: plan.openings.filter((o) => o.id !== selected && o.wallId !== selected),
		});
		select(null);
	};
	async function command(device: Item, patch: Partial<Pick<Item, "on" | "value">>) {
		setBusy(device.id);
		try {
			const result = await mockAdapter.command(device, patch);
			const p = current.current;
			change({ ...p, items: p.items.map((i) => (i.id === device.id ? { ...i, ...result } : i)) });
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setBusy(null);
		}
	}
	function replace(p: Plan) {
		if ((plan.walls.length || plan.items.length) && !window.confirm("替换当前模型？可通过撤销恢复。")) return;
		change(p);
		select(null);
	}
	return (
		<div className="twin space-y-4">
			<header className="twin-header">
				<div className="twin-heading">
					<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<House size={20} />
					</div>
					<div>
						<h1>家庭数字孪生</h1>
						<Input
							aria-label="模型名称"
							value={plan.name}
							maxLength={80}
							className="mt-1 h-6 w-48 border-0 px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
							onChange={(e) => change({ ...plan, name: e.target.value || "我的家" })}
						/>
					</div>
				</div>
				<div className="twin-actions">
					<span className="twin-save">{saved ? "已保存到本机" : "保存失败"}</span>
					<Button type="button" variant="outline" size="icon" title="新建空白模型" onClick={() => replace(blankPlan())}>
						<Plus size={17} />
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => replace(demoPlan())}>
						示例户型
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						title="导入模型 JSON"
						onClick={() => input.current?.click()}
					>
						<Upload size={17} />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						title="导出模型 JSON"
						onClick={() => {
							const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }));
							const a = document.createElement("a");
							a.href = url;
							a.download = `${plan.name}.json`;
							a.click();
							URL.revokeObjectURL(url);
						}}
					>
						<Download size={17} />
					</Button>
					<input
						ref={input}
						type="file"
						accept=".json,application/json"
						hidden
						onChange={async (e) => {
							const file = e.target.files?.[0];
							e.target.value = "";
							if (!file) return;
							try {
								if (file.size > 2_000_000) throw new Error();
								replace(planSchema.parse(JSON.parse(await file.text())));
							} catch {
								toast.error("模型文件无效，请选择导出的 JSON 文件（小于 2 MB）");
							}
						}}
					/>
				</div>
			</header>
			<Card className="twin-workspace overflow-hidden p-0">
				<aside className="twin-library">
					<section className="twin-tool-group">
						<h2>构建</h2>
						<div className="twin-tools">
							{[
								["select", MousePointer2, "选择"],
								["wall", PencilRuler, "墙体"],
								["door", DoorOpen, "门"],
								["window", PanelsTopLeft, "窗"],
							].map(([key, Icon, label]) => {
								const Glyph = Icon as typeof MousePointer2;
								return (
									<Button
										type="button"
										key={key as string}
										title={key === "select" ? "选择：点击选中，拖动平移平面图（Esc 返回）" : (label as string)}
										variant="outline"
										className={cn("twin-tool", tool === key && "active")}
										onClick={() => setTool(key as string)}
									>
										<Glyph size={19} />
										<span>{label as string}</span>
									</Button>
								);
							})}
						</div>
					</section>
					<Separator orientation="vertical" className="twin-library-separator" />
					<section className="twin-tool-group">
						<h2>家具</h2>
						<div className="twin-tools">{(["sofa", "bed", "table"] as Kind[]).map(renderTool)}</div>
					</section>
					<Separator orientation="vertical" className="twin-library-separator" />
					<section className="twin-tool-group">
						<h2>
							智能设备 <Badge variant="secondary">模拟</Badge>
						</h2>
						<div className="twin-tools">{(["light", "socket", "ac", "sensor"] as Kind[]).map(renderTool)}</div>
					</section>
					<Separator orientation="vertical" className="twin-library-separator" />
					<div className="twin-totals">
						<span>
							墙体 <b>{plan.walls.length}</b>
						</span>
						<span>
							设备 <b>{plan.items.filter((i) => isDevice(i.kind)).length}</b>
						</span>
						<span>
							门窗 <b>{plan.openings.length}</b>
						</span>
					</div>
				</aside>
				<main className="twin-main">
					<div className="twin-toolbar">
						<Tabs value={view} onValueChange={setView}>
							<TabsList>
								{[
									["2d", LayoutGrid, "平面"],
									["split", Columns2, "联动"],
									["3d", Box, "三维"],
								].map(([v, I, t]) => {
									const Icon = I as typeof Box;
									return (
										<TabsTrigger key={v as string} value={v as string}>
											<Icon size={16} />
											{t as string}
										</TabsTrigger>
									);
								})}
							</TabsList>
						</Tabs>
						<div className="twin-actions">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								title="撤销"
								disabled={!history.current.length}
								onClick={() => {
									const p = history.current.pop();
									if (p) {
										future.current.push(plan);
										setPlan(p);
										select(null);
									}
								}}
							>
								<Undo2 size={16} />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								title="重做"
								disabled={!future.current.length}
								onClick={() => {
									const p = future.current.pop();
									if (p) {
										history.current.push(plan);
										setPlan(p);
										select(null);
									}
								}}
							>
								<Redo2 size={16} />
							</Button>
						</div>
					</div>
					<div className={`twin-views ${view === "split" ? "split" : ""}`}>
						{view !== "3d" && (
							<section className="twin-viewport">
								<div className="twin-view-label">
									平面图 <span>20 × 20 m</span>
								</div>
								<Editor
									plan={plan}
									change={change}
									selected={selected}
									select={select}
									tool={tool}
									resetTool={() => setTool("select")}
								/>
							</section>
						)}
						{view !== "2d" && (
							<section className="twin-viewport">
								<div className="twin-view-label twin-view-label-col">
									<span className="twin-view-title">空间预览</span>
									<span className="twin-sun-wrap">
										<div className="twin-sun">
											<Slider
												min={minTime}
												max={maxTime}
												step={0.25}
												value={[Math.min(maxTime, Math.max(minTime, time))]}
												onValueChange={([value]) => setTime(value)}
												tooltipMode="never"
												aria-label="一天中的时间"
											/>
											<b>{formatHour(Math.min(maxTime, Math.max(minTime, time)))}</b>
										</div>
										<Label className="twin-lowwall">
											<Switch checked={low} onCheckedChange={setLow} />
											低墙
										</Label>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="twin-sun-settings-btn h-7 text-xs"
											onClick={() => setShowSunSettings((v) => !v)}
											title="位置与太阳设置"
										>
											{showSunSettings ? "收起" : "位置与太阳"}
										</Button>
									</span>
									{showSunSettings && (
										<div className="twin-sun-settings">
											<Label>
												纬度
												<Input type="number" step="0.01" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
											</Label>
											<Label>
												经度
												<Input type="number" step="0.01" value={lon} onChange={(e) => setLon(Number(e.target.value))} />
											</Label>
											<Label>
												时区 (UTC±)
												<Input type="number" step="1" value={tz} onChange={(e) => setTz(Number(e.target.value))} />
											</Label>
											<Label>
												日期
												<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
											</Label>
											<span className="twin-sun-times">
												{dayRange
													? `日出 ${formatHour(dayRange.sunrise)} · 日落 ${formatHour(dayRange.sunset)}`
													: "当日极昼或极夜，无日出日落"}
											</span>
										</div>
									)}
								</div>
								<Suspense fallback={<div className="twin-empty">场景加载中…</div>}>
									<Scene plan={plan} selected={selected} select={select} top={low} time={time} sunCfg={sunCfg} />
								</Suspense>
							</section>
						)}
					</div>
					<footer className="twin-status">
						<span>{plan.name}</span>
						<span>网格 0.5 m · 吸附 0.1 m</span>
						<span>本地模型</span>
					</footer>
				</main>
				<aside className="twin-properties">
					<h2>{item ? item.name : wall ? "墙体属性" : opening ? "门窗属性" : "家庭设备"}</h2>
					{selected && (item || wall || opening) ? (
						<>
							<div className="twin-fields">
								{item && (
									<>
										<Label className="twin-field">
											名称
											<Input value={item.name} maxLength={80} onChange={(e) => updateItem({ name: e.target.value })} />
										</Label>
										<Label className="twin-field">
											旋转角度
											<Input
												type="number"
												value={item.rotation}
												onChange={(e) => updateItem({ rotation: Number(e.target.value) })}
											/>
										</Label>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => updateItem({ rotation: (item.rotation + 90) % 360 })}
										>
											<RotateCw size={16} />
											旋转 90°
										</Button>
									</>
								)}
								{wall &&
									(["height", "thickness"] as const).map((k) => (
										<Label key={k} className="twin-field">
											{k === "height" ? "墙高（m）" : "厚度（m）"}
											<Input
												type="number"
												step="0.1"
												min={k === "height" ? 1 : 0.05}
												max={k === "height" ? 6 : 1}
												value={wall[k]}
												onChange={(e) =>
													change({
														...plan,
														walls: plan.walls.map((w) =>
															w.id === wall.id
																? {
																		...w,
																		[k]: Math.max(
																			k === "height" ? 1 : 0.05,
																			Math.min(k === "height" ? 6 : 1, Number(e.target.value)),
																		),
																	}
																: w,
														),
													})
												}
											/>
										</Label>
									))}
								{opening && (
									<Label className="twin-field">
										宽度（m）
										<Input
											type="number"
											min="0.3"
											max="3"
											step="0.1"
											value={opening.width}
											onChange={(e) =>
												change({
													...plan,
													openings: plan.openings.map((o) =>
														o.id === opening.id
															? { ...o, width: Math.max(0.3, Math.min(3, Number(e.target.value))) }
															: o,
													),
												})
											}
										/>
									</Label>
								)}
							</div>
							{item && isDevice(item.kind) && (
								<div className="twin-device">
									<h2>
										设备状态 <Badge variant="secondary">模拟</Badge>
									</h2>
									<Label className="twin-toggle">
										在线
										<Switch checked={item.online} onCheckedChange={(checked) => updateItem({ online: checked })} />
									</Label>
									{item.kind !== "sensor" ? (
										<>
											<Label className="twin-toggle">
												电源
												<Switch
													disabled={!!busy || !item.online}
													checked={item.on}
													onCheckedChange={(checked) => command(item, { on: checked })}
												/>
											</Label>
											{["light", "ac"].includes(item.kind) && (
												<Label className="twin-field">
													{item.kind === "ac" ? "温度" : "亮度"} · {item.value}
													{item.kind === "ac" ? " °C" : " %"}
													<Slider
														aria-label={item.kind === "ac" ? "温度" : "亮度"}
														min={item.kind === "ac" ? 16 : 0}
														max={item.kind === "ac" ? 30 : 100}
														disabled={!!busy || !item.online}
														value={[item.value]}
														onValueChange={([value]) => command(item, { value })}
													/>
												</Label>
											)}
										</>
									) : (
										<div className="twin-reading">
											24.6 °C <small>湿度 48%</small>
										</div>
									)}
									<Label className="twin-field">
										设备绑定 ID
										<Input
											placeholder="例如 light.living_room"
											value={item.binding}
											onChange={(e) => updateItem({ binding: e.target.value })}
										/>
									</Label>
									{busy === item.id && <small>正在发送指令…</small>}
								</div>
							)}
							<Button type="button" variant="destructive" className="twin-delete" onClick={remove}>
								<Trash2 size={16} />
								删除{item ? "物件" : wall ? "墙体" : "门窗"}
							</Button>
						</>
					) : (
						<div className="twin-device-list">
							{plan.items
								.filter((i) => isDevice(i.kind))
								.map((i) => {
									const Icon = icons[i.kind];
									return (
										<Button type="button" variant="ghost" key={i.id} onClick={() => select(i.id)}>
											<Icon size={18} />
											<span>
												{i.name}
												<small>
													{!i.online ? "离线" : i.kind === "sensor" ? "24.6 °C" : i.on ? "已开启" : "已关闭"}
												</small>
											</span>
											<i className={i.online ? "online" : ""} />
										</Button>
									);
								})}
							{!plan.items.some((i) => isDevice(i.kind)) && <p className="twin-muted">暂无设备</p>}
						</div>
					)}
				</aside>
			</Card>
		</div>
	);
	function renderTool(kind: Kind) {
		const Icon = icons[kind];
		return (
			<Button
				type="button"
				key={kind}
				variant="outline"
				draggable
				onDragStart={(e) => e.dataTransfer.setData("twin-kind", kind)}
				className={cn("twin-tool", tool === kind && "active")}
				onClick={() => setTool(kind)}
				title={labels[kind]}
			>
				<Icon size={20} />
				<span>{labels[kind]}</span>
			</Button>
		);
	}
}
