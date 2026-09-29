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
	const [saved, setSaved] = useState(true);
	const [busy, setBusy] = useState<string | null>(null);
	const history = useRef<Plan[]>([]),
		future = useRef<Plan[]>([]),
		input = useRef<HTMLInputElement>(null);
	const current = useRef(plan);
	current.current = plan;
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
		<div className="twin">
			<header className="twin-header">
				<div className="twin-heading">
					<House size={26} />
					<div>
						<h1>家庭数字孪生</h1>
						<input
							aria-label="模型名称"
							value={plan.name}
							maxLength={80}
							onChange={(e) => change({ ...plan, name: e.target.value || "我的家" })}
						/>
					</div>
				</div>
				<div className="twin-actions">
					<span className="twin-save">{saved ? "已保存到本机" : "保存失败"}</span>
					<button type="button" title="新建空白模型" onClick={() => replace(blankPlan())}>
						<Plus size={17} />
					</button>
					<button type="button" onClick={() => replace(demoPlan())}>
						示例户型
					</button>
					<button type="button" title="导入模型 JSON" onClick={() => input.current?.click()}>
						<Upload size={17} />
					</button>
					<button
						type="button"
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
					</button>
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
			<div className="twin-workspace">
				<aside className="twin-library">
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
								<button
									type="button"
									key={key as string}
									title={label as string}
									className={tool === key ? "active" : ""}
									onClick={() => setTool(key as string)}
								>
									<Glyph size={19} />
									<span>{label as string}</span>
								</button>
							);
						})}
					</div>
					<h2>家具</h2>
					<div className="twin-tools">{(["sofa", "bed", "table"] as Kind[]).map(renderTool)}</div>
					<h2>
						智能设备 <span className="twin-badge">模拟</span>
					</h2>
					<div className="twin-tools">{(["light", "socket", "ac", "sensor"] as Kind[]).map(renderTool)}</div>
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
						<div className="twin-segment">
							{[
								["2d", LayoutGrid, "平面"],
								["split", Columns2, "联动"],
								["3d", Box, "三维"],
							].map(([v, I, t]) => {
								const Icon = I as typeof Box;
								return (
									<button
										type="button"
										key={v as string}
										className={view === v ? "active" : ""}
										onClick={() => setView(v as string)}
									>
										<Icon size={16} />
										{t as string}
									</button>
								);
							})}
						</div>
						<div className="twin-actions">
							<button
								type="button"
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
							</button>
							<button
								type="button"
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
							</button>
						</div>
					</div>
					<div className={`twin-views ${view === "split" ? "split" : ""}`}>
						{view !== "3d" && (
							<section className="twin-viewport">
								<div className="twin-view-label">
									平面图 <span>20 × 20 m</span>
								</div>
								<Editor key={tool} plan={plan} change={change} selected={selected} select={select} tool={tool} />
							</section>
						)}
						{view !== "2d" && (
							<section className="twin-viewport">
								<div className="twin-view-label">
									空间预览{" "}
									<label>
										<input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} />
										低墙
									</label>
								</div>
								<Suspense fallback={<div className="twin-empty">场景加载中…</div>}>
									<Scene plan={plan} selected={selected} select={select} top={low} />
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
										<label>
											名称
											<input value={item.name} maxLength={80} onChange={(e) => updateItem({ name: e.target.value })} />
										</label>
										<label>
											旋转角度
											<input
												type="number"
												value={item.rotation}
												onChange={(e) => updateItem({ rotation: Number(e.target.value) })}
											/>
										</label>
										<button type="button" onClick={() => updateItem({ rotation: (item.rotation + 90) % 360 })}>
											<RotateCw size={16} />
											旋转 90°
										</button>
									</>
								)}
								{wall &&
									(["height", "thickness"] as const).map((k) => (
										<label key={k}>
											{k === "height" ? "墙高（m）" : "厚度（m）"}
											<input
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
										</label>
									))}
								{opening && (
									<label>
										宽度（m）
										<input
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
									</label>
								)}
							</div>
							{item && isDevice(item.kind) && (
								<div className="twin-device">
									<h2>
										设备状态 <span className="twin-badge">模拟</span>
									</h2>
									<label className="twin-toggle">
										在线
										<input
											type="checkbox"
											checked={item.online}
											onChange={(e) => updateItem({ online: e.target.checked })}
										/>
									</label>
									{item.kind !== "sensor" ? (
										<>
											<label className="twin-toggle">
												电源
												<input
													type="checkbox"
													disabled={!!busy || !item.online}
													checked={item.on}
													onChange={(e) => command(item, { on: e.target.checked })}
												/>
											</label>
											{["light", "ac"].includes(item.kind) && (
												<label>
													{item.kind === "ac" ? "温度" : "亮度"} · {item.value}
													{item.kind === "ac" ? " °C" : " %"}
													<input
														aria-label={item.kind === "ac" ? "温度" : "亮度"}
														type="range"
														min={item.kind === "ac" ? 16 : 0}
														max={item.kind === "ac" ? 30 : 100}
														disabled={!!busy || !item.online}
														value={item.value}
														onChange={(e) => command(item, { value: Number(e.target.value) })}
													/>
												</label>
											)}
										</>
									) : (
										<div className="twin-reading">
											24.6 °C <small>湿度 48%</small>
										</div>
									)}
									<label>
										设备绑定 ID
										<input
											placeholder="例如 light.living_room"
											value={item.binding}
											onChange={(e) => updateItem({ binding: e.target.value })}
										/>
									</label>
									{busy === item.id && <small>正在发送指令…</small>}
								</div>
							)}
							<button type="button" className="twin-delete" onClick={remove}>
								<Trash2 size={16} />
								删除{item ? "物件" : wall ? "墙体" : "门窗"}
							</button>
						</>
					) : (
						<div className="twin-device-list">
							{plan.items
								.filter((i) => isDevice(i.kind))
								.map((i) => {
									const Icon = icons[i.kind];
									return (
										<button type="button" key={i.id} onClick={() => select(i.id)}>
											<Icon size={18} />
											<span>
												{i.name}
												<small>
													{!i.online ? "离线" : i.kind === "sensor" ? "24.6 °C" : i.on ? "已开启" : "已关闭"}
												</small>
											</span>
											<i className={i.online ? "online" : ""} />
										</button>
									);
								})}
							{!plan.items.some((i) => isDevice(i.kind)) && <p className="twin-muted">暂无设备</p>}
						</div>
					)}
				</aside>
			</div>
		</div>
	);
	function renderTool(kind: Kind) {
		const Icon = icons[kind];
		return (
			<button
				type="button"
				key={kind}
				draggable
				onDragStart={(e) => e.dataTransfer.setData("twin-kind", kind)}
				className={tool === kind ? "active" : ""}
				onClick={() => setTool(kind)}
				title={labels[kind]}
			>
				<Icon size={20} />
				<span>{labels[kind]}</span>
			</button>
		);
	}
}
