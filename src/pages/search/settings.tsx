import { GlassInput, GlassSwitch } from "@zakisheriff/liquid-glass";
import { useState } from "react";
import searchService, { type SearchSettings } from "@/api/services/searchService";
import { GlassAction, GlassPanel } from "../subscriptions/glass";
import { defaults, errorMessage, settingsPatch, validGradient, validUrl } from "./logic";
import { EngineSelect, OnlineImage, SearchSelect, SearchSheet, SearchSlider, useLabels } from "./shared";

export function Settings({
	saved,
	draft,
	setDraft,
	close,
	onSaved,
}: {
	saved: SearchSettings;
	draft: SearchSettings;
	setDraft: (s: SearchSettings) => void;
	close: () => void;
	onSaved: (s: SearchSettings) => void;
}) {
	const l = useLabels();
	const [original] = useState(() => ({ ...defaults, ...saved }));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [preview, setPreview] = useState("");
	const [verified, setVerified] = useState("");
	const patch = (s: Partial<SearchSettings>) => setDraft({ ...draft, ...s });
	const changedImage =
		draft.backgroundMode === "online" &&
		(draft.wallpaperUrl !== original.wallpaperUrl || original.backgroundMode !== "online");
	const save = async () => {
		if (!validGradient(draft)) {
			setError(l("invalidGradient"));
			return;
		}
		if (changedImage && (!validUrl(draft.wallpaperUrl || "", true) || verified !== draft.wallpaperUrl)) {
			setError(l("verifyImage"));
			return;
		}
		setBusy(true);
		setError("");
		try {
			onSaved(await searchService.saveSettings(settingsPatch(original, draft)));
		} catch (e) {
			setError(errorMessage(e, l("saveFailed"), l("conflict")));
		} finally {
			setBusy(false);
		}
	};
	return (
		<SearchSheet
			title={l("settings")}
			close={() => !busy && close()}
			footer={
				<>
					<button type="button" disabled={busy} onClick={close}>
						{l("cancel")}
					</button>
					<GlassAction disabled={busy} onClick={save}>
						{busy ? l("saving") : l("save")}
					</GlassAction>
				</>
			}
		>
			<fieldset className="search-form" disabled={busy}>
				<GlassPanel className="search-fields search-section" radius="20px">
					<h3>{l("searchBehavior")}</h3>
					<div className="search-field">
						<span>{l("defaultEngine")}</span>
						<EngineSelect value={draft.defaultEngine} onChange={(defaultEngine) => patch({ defaultEngine })} />
					</div>
					<label className="search-check">
						<span>{l("newTab")}</span>
						<GlassSwitch
							intensity={1}
							tint="var(--primary)"
							aria-label={l("newTab")}
							checked={draft.openInNewTab}
							onChange={(openInNewTab) => patch({ openInNewTab })}
						/>
					</label>
				</GlassPanel>
				<GlassPanel className="search-fields search-section" radius="20px">
					<h3>{l("wallpaper")}</h3>
					<SearchSelect
						label={l("wallpaper")}
						value={draft.backgroundMode}
						onChange={(backgroundMode) => patch({ backgroundMode })}
						options={[
							{ value: "default", label: l("whiteBackground") },
							{ value: "gradient", label: l("gradient") },
							{ value: "online", label: l("online") },
						]}
					/>
					{draft.backgroundMode === "gradient" && (
						<>
							<div className="search-colors">
								{(["gradientFrom", "gradientTo"] as const).map((key) => (
									<div className="search-field" key={key}>
										<span>{l(key)}</span>
										<div className="search-color-control">
											<input
												type="color"
												aria-label={l(key)}
												value={/^#[\da-f]{6}$/i.test(draft[key]) ? draft[key] : defaults[key]}
												onChange={(e) => patch({ [key]: e.target.value })}
											/>
											<GlassInput
												intensity={1}
												aria-label={`${l(key)} HEX`}
												maxLength={7}
												value={draft[key]}
												onChange={(e) => patch({ [key]: e.target.value })}
												aria-invalid={!/^#[\da-f]{6}$/i.test(draft[key])}
											/>
										</div>
									</div>
								))}
							</div>
							<SearchSelect
								label={l("gradientDirection")}
								value={String(draft.gradientAngle)}
								onChange={(angle) => patch({ gradientAngle: Number(angle) })}
								options={[
									{ value: "0", label: l("toTop") },
									{ value: "90", label: l("toRight") },
									{ value: "180", label: l("toBottom") },
									{ value: "270", label: l("toLeft") },
									{ value: "135", label: l("diagonal") },
									...(![0, 90, 180, 270, 135].includes(draft.gradientAngle)
										? [{ value: String(draft.gradientAngle), label: `${draft.gradientAngle}°` }]
										: []),
								]}
							/>
							<label>
								{l("gradientAngle")} <output>{draft.gradientAngle}°</output>
								<SearchSlider
									intensity={1}
									min={0}
									max={359}
									step={1}
									value={draft.gradientAngle}
									aria-label={l("gradientAngle")}
									onChange={(gradientAngle) => patch({ gradientAngle })}
								/>
							</label>
							<div
								className="search-gradient-preview"
								aria-label={l("backgroundPreview")}
								style={{
									background: validGradient(draft)
										? `linear-gradient(${draft.gradientAngle}deg, ${draft.gradientFrom}, ${draft.gradientTo})`
										: undefined,
								}}
							/>
						</>
					)}
					{draft.backgroundMode === "online" && (
						<>
							<div className="search-field">
								<span>{l("imageUrl")}</span>
								<GlassInput
									aria-label={l("imageUrl")}
									intensity={1}
									type="url"
									maxLength={2048}
									value={draft.wallpaperUrl || ""}
									onChange={(e) => {
										patch({ wallpaperUrl: e.target.value });
										setVerified("");
										setPreview("");
									}}
									placeholder="https://…"
								/>
							</div>
							<button
								type="button"
								onClick={() => {
									if (!validUrl(draft.wallpaperUrl || "", true)) {
										setError(l("invalidImage"));
										return;
									}
									setError("");
									setPreview(draft.wallpaperUrl!);
								}}
							>
								{l("preview")}
							</button>
							{preview && (
								<OnlineImage
									key={preview}
									url={preview}
									alt={l("preview")}
									className="search-image-preview"
									onResult={(ok) => {
										setVerified(ok ? preview : "");
										if (!ok) setError(l("imageFailed"));
									}}
								/>
							)}
							<button type="button" onClick={() => patch({ wallpaperUrl: null, backgroundMode: "default" })}>
								{l("removeImage")}
							</button>
							<label>
								{l("overlayOpacity")} <output>{draft.overlayOpacity}</output>
								<SearchSlider
									intensity={1}
									min={0}
									max={0.85}
									step={0.01}
									value={draft.overlayOpacity}
									aria-label={l("overlayOpacity")}
									onChange={(overlayOpacity) => patch({ overlayOpacity })}
								/>
							</label>
						</>
					)}
				</GlassPanel>
				<GlassPanel className="search-fields search-section" radius="20px">
					<h3>{l("bookmarkLayout")}</h3>
					{(
						[
							["iconSize", 40, 112],
							["gap", 8, 48],
							["radius", 0, Math.floor(draft.iconSize / 2)],
							["itemsPerLine", 1, 12],
						] as const
					).map(([key, min, max]) => (
						<label key={key}>
							{l(key)} <output>{draft[key]}</output>
							<SearchSlider
								intensity={1}
								min={min}
								max={max}
								step={1}
								value={draft[key]}
								aria-label={l(key)}
								onChange={(value) =>
									patch(
										key === "iconSize"
											? { iconSize: value, radius: Math.min(draft.radius, Math.floor(value / 2)) }
											: { [key]: value },
									)
								}
							/>
						</label>
					))}
					<div className="search-field">
						<span>{l("direction")}</span>
						<SearchSelect
							label={l("direction")}
							value={draft.layoutDirection}
							onChange={(layoutDirection) => patch({ layoutDirection })}
							options={[
								{ value: "row", label: l("row") },
								{ value: "column", label: l("column") },
							]}
						/>
					</div>
					<p className="search-help">{l("responsive")}</p>
				</GlassPanel>
				<button
					className="search-reset"
					type="button"
					onClick={() => {
						setDraft({ ...defaults, version: draft.version });
						setError("");
					}}
				>
					{l("reset")}
				</button>
				{error && (
					<p role="alert" className="search-error">
						{error}
					</p>
				)}
			</fieldset>
		</SearchSheet>
	);
}
