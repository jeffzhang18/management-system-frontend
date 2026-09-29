import { Hand, Scan, ZoomIn, ZoomOut } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { id, type Kind, labels, length, newItem, type Plan, type Point } from "./model";

export default function Editor({
	plan,
	change,
	selected,
	select,
	tool,
}: {
	plan: Plan;
	change: (p: Plan, record?: boolean) => void;
	selected: string | null;
	select: (s: string | null) => void;
	tool: string;
}) {
	const svg = useRef<SVGSVGElement>(null);
	const [frame, setFrame] = useState({ x: 0, y: 0, size: 1000 });
	const [panMode, setPanMode] = useState(false);
	const pan = useRef<{ x: number; y: number; frame: typeof frame } | null>(null);
	const zoom = (factor: number) =>
		setFrame((f) => {
			const size = Math.max(250, Math.min(1500, f.size * factor));
			return { x: f.x + (f.size - size) / 2, y: f.y + (f.size - size) / 2, size };
		});
	const [start, setStart] = useState<Point | null>(null);
	const [cursor, setCursor] = useState<Point | null>(null);
	const drag = useRef<{ id: string; end?: "a" | "b"; plan: Plan; moved?: boolean } | null>(null);
	const point = (x: number, y: number): Point => {
		const matrix = svg.current?.getScreenCTM();
		if (!matrix) return { x: 0, y: 0 };
		const p = new DOMPoint(x, y).matrixTransform(matrix.inverse());
		const raw = {
			x: Math.max(0, Math.min(20, Math.round(p.x / 5) * 0.1)),
			y: Math.max(0, Math.min(20, Math.round(p.y / 5) * 0.1)),
		};
		const endpoint = plan.walls.flatMap((w) => [w.a, w.b]).find((p) => Math.hypot(p.x - raw.x, p.y - raw.y) < 0.18);
		return endpoint ?? raw;
	};
	const down = (e: PointerEvent<SVGSVGElement>) => {
		if (panMode || e.button === 1) {
			e.preventDefault();
			pan.current = { x: e.clientX, y: e.clientY, frame };
			svg.current?.setPointerCapture(e.pointerId);
			return;
		}
		const p = point(e.clientX, e.clientY);
		if (tool === "wall") {
			if (start) {
				if (Math.hypot(start.x - p.x, start.y - p.y) >= 0.1)
					change({ ...plan, walls: [...plan.walls, { id: id(), a: start, b: p, height: 2.8, thickness: 0.18 }] });
				setStart(null);
			} else setStart(p);
		} else if (!["select", "door", "window"].includes(tool)) {
			const item = newItem(tool as Kind, p);
			change({ ...plan, items: [...plan.items, item] });
			select(item.id);
		} else select(null);
	};
	return (
		<>
			<div className="twin-canvas-tools">
				<button type="button" title="放大平面图" onClick={() => zoom(0.8)}>
					<ZoomIn size={16} />
				</button>
				<button type="button" title="缩小平面图" onClick={() => zoom(1.25)}>
					<ZoomOut size={16} />
				</button>
				<button
					type="button"
					title="平移平面图"
					className={panMode ? "active" : ""}
					onClick={() => setPanMode(!panMode)}
				>
					<Hand size={16} />
				</button>
				<button type="button" title="重置平面视图" onClick={() => setFrame({ x: 0, y: 0, size: 1000 })}>
					<Scan size={16} />
				</button>
			</div>
			<svg
				ref={svg}
				className="twin-plan"
				viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`}
				aria-label="户型平面编辑器"
				onKeyDown={(e) => {
					if (e.key === "Escape") setStart(null);
				}}
				onPointerDown={down}
				onPointerMove={(e) => {
					if (pan.current) {
						const d = pan.current;
						const scale = svg.current?.getScreenCTM()?.a;
						if (!scale) return;
						setFrame({
							...d.frame,
							x: d.frame.x - (e.clientX - d.x) / scale,
							y: d.frame.y - (e.clientY - d.y) / scale,
						});
						return;
					}
					const p = point(e.clientX, e.clientY);
					setCursor(p);
					if (drag.current) {
						const d = drag.current;
						const end = d.end;
						const draft = end
							? { ...d.plan, walls: d.plan.walls.map((w) => (w.id === d.id ? { ...w, [end]: p } : w)) }
							: { ...d.plan, items: d.plan.items.map((i) => (i.id === d.id ? { ...i, ...p } : i)) };
						if (draft.walls.every((w) => length(w) >= 0.1)) {
							change(draft, !d.moved);
							d.moved = true;
						}
					}
				}}
				onPointerUp={() => {
					pan.current = null;
					drag.current = null;
				}}
				onPointerCancel={() => {
					pan.current = null;
					drag.current = null;
				}}
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					const kind = e.dataTransfer.getData("twin-kind");
					if (Object.keys(labels).includes(kind)) {
						const item = newItem(kind as Kind, point(e.clientX, e.clientY));
						change({ ...plan, items: [...plan.items, item] });
						select(item.id);
					}
				}}
			>
				<title>户型平面编辑器</title>
				<defs>
					<pattern id="twin-grid" width="25" height="25" patternUnits="userSpaceOnUse">
						<path d="M 25 0 L 0 0 0 25" fill="none" stroke="#dfe7e4" strokeWidth=".8" />
					</pattern>
				</defs>
				<rect width="1000" height="1000" fill="#f8faf9" />
				<rect width="1000" height="1000" fill="url(#twin-grid)" />
				{Array.from({ length: 10 }, (_, n) => n * 2).map((v) => (
					<text key={v} x={(v / 2) * 100 + 5} y={17} fill="#7d9188" fontSize="12">
						{v} m
					</text>
				))}
				{plan.walls.map((w) => (
					<g key={w.id}>
						<line
							x1={w.a.x * 50}
							y1={w.a.y * 50}
							x2={w.b.x * 50}
							y2={w.b.y * 50}
							stroke={selected === w.id ? "#159b80" : "#61746d"}
							strokeWidth={w.thickness * 50}
							strokeLinecap="square"
							onPointerDown={(e) => {
								if (tool === "wall" || panMode) return;
								e.stopPropagation();
								if (tool === "door" || tool === "window") {
									const p = point(e.clientX, e.clientY);
									const t = ((p.x - w.a.x) * (w.b.x - w.a.x) + (p.y - w.a.y) * (w.b.y - w.a.y)) / length(w) ** 2;
									change({
										...plan,
										openings: [
											...plan.openings,
											{
												id: id(),
												wallId: w.id,
												kind: tool,
												offset: Math.max(0.1, Math.min(0.9, t)),
												width: tool === "door" ? 0.9 : 1.4,
											},
										],
									});
								} else select(w.id);
							}}
						/>
						<text
							x={(w.a.x + w.b.x) * 25}
							y={(w.a.y + w.b.y) * 25 - 12}
							fontSize="11"
							fill="#72827c"
							textAnchor="middle"
						>
							{length(w).toFixed(1)} m
						</text>
						{selected === w.id &&
							(["a", "b"] as const).map((end) => (
								<circle
									key={end}
									cx={w[end].x * 50}
									cy={w[end].y * 50}
									r="7"
									fill="#fff"
									stroke="#159b80"
									strokeWidth="2"
									onPointerDown={(e) => {
										e.stopPropagation();
										drag.current = { id: w.id, end, plan };
										svg.current?.setPointerCapture(e.pointerId);
									}}
								/>
							))}
					</g>
				))}
				{plan.openings.map((o) => {
					const w = plan.walls.find((w) => w.id === o.wallId);
					if (!w) return null;
					return (
						<g
							key={o.id}
							transform={`translate(${(w.a.x + (w.b.x - w.a.x) * o.offset) * 50},${(w.a.y + (w.b.y - w.a.y) * o.offset) * 50}) rotate(${(Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI})`}
							onPointerDown={(e) => {
								e.stopPropagation();
								select(o.id);
							}}
						>
							<rect
								x={-o.width * 25}
								y={-6}
								width={o.width * 50}
								height={12}
								fill={o.kind === "door" ? "#e7d8ab" : "#b5e5ef"}
								stroke={selected === o.id ? "#159b80" : "#79968b"}
							/>
						</g>
					);
				})}
				{plan.items.map((i) => (
					<g
						key={i.id}
						transform={`translate(${i.x * 50},${i.y * 50}) rotate(${i.rotation})`}
						onPointerDown={(e) => {
							if (tool !== "select" || panMode) return;
							e.stopPropagation();
							select(i.id);
							drag.current = { id: i.id, plan };
							svg.current?.setPointerCapture(e.pointerId);
						}}
						style={{ cursor: "grab" }}
					>
						<rect
							x={i.kind === "sofa" ? -52 : i.kind === "bed" ? -40 : -25}
							y={i.kind === "bed" ? -50 : -22}
							width={i.kind === "sofa" ? 104 : i.kind === "bed" ? 80 : 50}
							height={i.kind === "bed" ? 100 : 44}
							rx="5"
							fill={i.on ? "#f7e4a3" : "#dce8e3"}
							stroke={selected === i.id ? "#069879" : "#9eb5aa"}
							strokeWidth={selected === i.id ? 3 : 1.5}
						/>
						<text textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#355c4e">
							{i.name.slice(0, 6)}
						</text>
					</g>
				))}
				{start && cursor && (
					<line
						x1={start.x * 50}
						y1={start.y * 50}
						x2={cursor.x * 50}
						y2={cursor.y * 50}
						stroke="#159b80"
						strokeWidth="6"
						strokeDasharray="8 5"
					/>
				)}
			</svg>
		</>
	);
}
