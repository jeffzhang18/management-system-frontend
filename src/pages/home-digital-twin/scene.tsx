import { Grid, Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode } from "react";
import { type Item, isDevice, length, type Plan } from "./model";

function Box({
	position,
	size,
	color,
}: {
	position: [number, number, number];
	size: [number, number, number];
	color: string;
}) {
	return (
		<mesh position={position} castShadow receiveShadow>
			<boxGeometry args={size} />
			<meshStandardMaterial color={color} />
		</mesh>
	);
}
function Object3D({ item, selected, select }: { item: Item; selected: boolean; select: () => void }) {
	const color = selected
		? "#16a085"
		: isDevice(item.kind)
			? !item.online
				? "#9ca3af"
				: item.on
					? "#f4c453"
					: "#508b9b"
			: "#849b92";
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Three.js scene node, not a DOM element.
		<group
			position={[item.x, 0, item.y]}
			rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
			onClick={(e) => {
				e.stopPropagation();
				select();
			}}
		>
			{item.kind === "sofa" ? (
				<>
					<Box position={[0, 0.28, 0]} size={[2.1, 0.5, 0.85]} color={color} />
					<Box position={[0, 0.65, -0.35]} size={[2.1, 0.6, 0.18]} color={color} />
					{[-1, 1].map((x) => (
						<Box key={x} position={[x, 0.5, 0]} size={[0.18, 0.55, 0.9]} color={color} />
					))}
				</>
			) : item.kind === "bed" ? (
				<>
					<Box position={[0, 0.22, 0]} size={[1.6, 0.4, 2]} color={color} />
					<Box position={[0, 0.47, 0]} size={[1.5, 0.16, 1.9]} color="#eceef0" />
					<Box position={[0, 0.6, -0.65]} size={[1.3, 0.13, 0.4]} color="#adc3cd" />
				</>
			) : item.kind === "table" ? (
				<>
					<Box position={[0, 0.75, 0]} size={[1.6, 0.12, 1]} color={color} />
					{[-0.6, 0.6].flatMap((x) =>
						[-0.3, 0.3].map((z) => (
							<Box key={`${x}-${z}`} position={[x, 0.36, z]} size={[0.08, 0.72, 0.08]} color="#64716e" />
						)),
					)}
				</>
			) : (
				<>
					<Box
						position={[0, item.kind === "ac" ? 1.9 : 0.18, 0]}
						size={item.kind === "ac" ? [1, 0.3, 0.25] : [0.32, 0.32, 0.32]}
						color={color}
					/>
					{item.kind === "light" && item.on && (
						<pointLight position={[0, 1.3, 0]} intensity={item.value / 10} distance={5} color="#ffe3a0" />
					)}
				</>
			)}
			{isDevice(item.kind) && (
				<Html position={[0, item.kind === "ac" ? 2.3 : 0.7, 0]} center distanceFactor={18}>
					<button type="button" className={`twin-marker ${item.on ? "on" : ""}`} onClick={select}>
						{item.name}
					</button>
				</Html>
			)}
		</group>
	);
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? (
			<div className="twin-empty">3D 无法启动，请开启浏览器硬件加速。平面编辑仍可使用。</div>
		) : (
			this.props.children
		);
	}
}
export default function Scene({
	plan,
	selected,
	select,
	top,
}: {
	plan: Plan;
	selected: string | null;
	select: (id: string | null) => void;
	top: boolean;
}) {
	return (
		<SceneBoundary>
			<Canvas
				shadows
				gl={{ preserveDrawingBuffer: true }}
				camera={{ position: [19, 19, 23], fov: 42 }}
				onPointerMissed={() => select(null)}
			>
				<color attach="background" args={["#edf1f1"]} />
				<ambientLight intensity={1.5} />
				<directionalLight position={[8, 16, 8]} intensity={2} castShadow shadow-mapSize={[2048, 2048]} />
				<Grid
					position={[10, -0.04, 10]}
					args={[24, 24]}
					cellSize={0.5}
					sectionSize={1}
					cellColor="#d9dfdf"
					sectionColor="#bcc9c7"
					fadeDistance={60}
				/>
				<Box position={[10, -0.12, 10]} size={[20, 0.15, 20]} color="#f8faf9" />
				{plan.walls.map((w) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: Three.js scene node, not a DOM element.
					<group
						key={w.id}
						position={[(w.a.x + w.b.x) / 2, 0, (w.a.y + w.b.y) / 2]}
						rotation={[0, -Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x), 0]}
						onClick={(e) => {
							e.stopPropagation();
							select(w.id);
						}}
					>
						<Box
							position={[0, (top ? 0.25 : w.height) / 2, 0]}
							size={[length(w), top ? 0.25 : w.height, w.thickness]}
							color={selected === w.id ? "#63b7a5" : "#d0d8d6"}
						/>
						{plan.openings
							.filter((o) => o.wallId === w.id)
							.map((o) => (
								<Box
									key={o.id}
									position={[(o.offset - 0.5) * length(w), o.kind === "door" ? 1 : 1.5, 0]}
									size={[o.width, o.kind === "door" ? 2 : 1, w.thickness + 0.025]}
									color={o.kind === "door" ? "#879b95" : "#87c5d4"}
								/>
							))}
					</group>
				))}
				{plan.items.map((item) => (
					<Object3D key={item.id} item={item} selected={selected === item.id} select={() => select(item.id)} />
				))}
				<OrbitControls makeDefault target={[7, 0, 6]} minDistance={4} maxDistance={45} maxPolarAngle={Math.PI / 2.05} />
			</Canvas>
		</SceneBoundary>
	);
}
