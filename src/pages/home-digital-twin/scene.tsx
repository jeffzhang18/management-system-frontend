import { Grid, Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode, useEffect, useRef } from "react";
import type * as THREE from "three";
import { useSettings } from "@/store/settingStore";
import { presetsColors } from "@/theme/tokens/color";
import { type Item, isDevice, length, type Plan } from "./model";
import { type SunConfig, type SunPosition, sunPosition } from "./sun";

const SUN_RADIUS = 46;
const CENTER: [number, number, number] = [10, 0, 10];
function SunLight({ sun }: { sun: SunPosition }) {
	const ref = useRef<THREE.DirectionalLight>(null);
	useEffect(() => {
		if (ref.current) {
			ref.current.target.position.set(CENTER[0], CENTER[1], CENTER[2]);
			ref.current.target.updateMatrixWorld();
		}
	}, []);
	const azimuth = (sun.azimuth * Math.PI) / 180;
	const elevation = (sun.elevation * Math.PI) / 180;
	// 方位角 0=北(-z)，90=东(+x)；高度角转成光的方向
	const dir: [number, number, number] = [
		Math.sin(azimuth) * Math.cos(elevation),
		Math.sin(elevation),
		-Math.cos(azimuth) * Math.cos(elevation),
	];
	const position: [number, number, number] = [
		CENTER[0] + dir[0] * SUN_RADIUS,
		CENTER[1] + dir[1] * SUN_RADIUS,
		CENTER[2] + dir[2] * SUN_RADIUS,
	];
	const elev = sun.elevation;
	const intensity = elev > 0.05 ? Math.min(3, 0.5 + elev * 0.045) : 0.08;
	const color = elev > 25 ? "#fff1d2" : elev > 5 ? "#ffdfa8" : "#ffd2a0";
	return (
		<directionalLight
			ref={ref}
			position={position}
			intensity={intensity}
			color={color}
			castShadow
			shadow-mapSize={[2048, 2048]}
			shadow-camera-left={-16}
			shadow-camera-right={16}
			shadow-camera-top={16}
			shadow-camera-bottom={-16}
			shadow-camera-near={1}
			shadow-camera-far={100}
			shadow-bias={-0.0004}
		/>
	);
}
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
function Object3D({
	item,
	selected,
	select,
	primary,
}: {
	item: Item;
	selected: boolean;
	select: () => void;
	primary: string;
}) {
	const color = selected
		? primary
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
	time = 12,
	sunCfg = { lat: 31.23, lon: 121.47, tzOffset: 8, year: 2026, month: 9, day: 29 },
}: {
	plan: Plan;
	selected: string | null;
	select: (id: string | null) => void;
	top: boolean;
	time?: number;
	sunCfg?: SunConfig;
}) {
	const { themeColorPresets } = useSettings();
	const primary = presetsColors[themeColorPresets].default;
	const sun = sunPosition(sunCfg, time);
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
				<SunLight sun={sun} />
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
							color={selected === w.id ? primary : "#d0d8d6"}
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
					<Object3D
						key={item.id}
						item={item}
						selected={selected === item.id}
						select={() => select(item.id)}
						primary={primary}
					/>
				))}
				<OrbitControls makeDefault target={[7, 0, 6]} minDistance={4} maxDistance={45} maxPolarAngle={Math.PI / 2.05} />
			</Canvas>
		</SceneBoundary>
	);
}
