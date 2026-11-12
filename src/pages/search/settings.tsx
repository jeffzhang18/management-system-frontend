import { useState } from "react";
import type { Engine, SearchSettings } from "@/api/services/searchService";
import searchService from "@/api/services/searchService";
import { GlassAction, GlassPanel } from "../subscriptions/glass";
import { defaults, errorMessage, settingsPatch, validUrl } from "./logic";
import { OnlineImage, SearchSheet, useLabels } from "./shared";
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
	const [original] = useState(saved);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [preview, setPreview] = useState("");
	const [verified, setVerified] = useState("");
	const patch = (s: Partial<SearchSettings>) => setDraft({ ...draft, ...s });
	const changedImage =
		draft.backgroundMode === "online" &&
		(draft.wallpaperUrl !== original.wallpaperUrl || original.backgroundMode !== "online");
	const save = async () => {
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
		<SearchSheet title={l("settings")} close={() => !busy && close()}>
			<GlassPanel className="search-settings-material">
				<div className="search-fields">
					<label>
						{l("defaultEngine")}
						<select value={draft.defaultEngine} onChange={(e) => patch({ defaultEngine: e.target.value as Engine })}>
							<option value="google">Google</option>
							<option value="baidu">{l("baidu")}</option>
							<option value="bing">Bing</option>
						</select>
					</label>
					<label className="search-check">
						<input
							type="checkbox"
							checked={draft.openInNewTab}
							onChange={(e) => patch({ openInNewTab: e.target.checked })}
						/>
						{l("newTab")}
					</label>
					<h3>{l("wallpaper")}</h3>
					<select
						aria-label={l("wallpaper")}
						value={draft.backgroundMode}
						onChange={(e) => patch({ backgroundMode: e.target.value as "default" | "online" })}
					>
						<option value="default">{l("gradient")}</option>
						<option value="online">{l("online")}</option>
					</select>
					{draft.backgroundMode === "online" && (
						<>
							<label>
								{l("imageUrl")}
								<input
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
							</label>
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
						</>
					)}
					{(
						[
							["overlayOpacity", 0, 0.85, 0.01],
							["iconSize", 40, 112, 1],
							["gap", 8, 48, 1],
							["radius", 0, draft.iconSize / 2, 1],
							["itemsPerLine", 1, 12, 1],
						] as const
					).map(([key, min, max, step]) => (
						<label key={key}>
							{l(key)} <output>{draft[key]}</output>
							<input
								type="range"
								min={min}
								max={max}
								step={step}
								value={draft[key]}
								onChange={(e) => {
									const value = Number(e.target.value);
									patch(
										key === "iconSize"
											? { iconSize: value, radius: Math.min(draft.radius, value / 2) }
											: { [key]: value },
									);
								}}
							/>
						</label>
					))}
					<label>
						{l("direction")}
						<select
							value={draft.layoutDirection}
							onChange={(e) => patch({ layoutDirection: e.target.value as "row" | "column" })}
						>
							<option value="row">{l("row")}</option>
							<option value="column">{l("column")}</option>
						</select>
					</label>
					<p className="search-help">{l("responsive")}</p>
					<button type="button" onClick={() => setDraft({ ...defaults, version: draft.version })}>
						{l("reset")}
					</button>
				</div>
			</GlassPanel>
			{error && (
				<p role="alert" className="search-error">
					{error}
				</p>
			)}
			<div className="search-footer">
				<button type="button" disabled={busy} onClick={close}>
					{l("cancel")}
				</button>
				<GlassAction disabled={busy} onClick={save}>
					{busy ? l("saving") : l("save")}
				</GlassAction>
			</div>
		</SearchSheet>
	);
}
