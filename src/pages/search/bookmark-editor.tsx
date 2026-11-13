import { useEffect, useRef, useState } from "react";
import searchService, { type Bookmark, type BookmarkInput } from "@/api/services/searchService";
import { GlassAction } from "../subscriptions/glass";
import { errorMessage, metadataCurrent, safeIcon, validUrl } from "./logic";
import { OnlineImage, SearchSheet, useLabels } from "./shared";
export function BookmarkEditor({ item, close, saved }: { item?: Bookmark; close: () => void; saved: () => void }) {
	const l = useLabels();
	const [form, setForm] = useState<BookmarkInput>({
		name: item?.name || "",
		url: item?.url || "",
		titleSource: item?.titleSource || "auto",
		iconSource: item?.iconSource || "auto",
		iconUrl: item?.iconUrl || null,
		metadataFetchedAt: item?.metadataFetchedAt || null,
	});
	const current = useRef(form);
	current.current = form;
	const [busy, setBusy] = useState(false);
	const [fetching, setFetching] = useState(false);
	const [error, setError] = useState("");
	const [preview, setPreview] = useState("");
	const [verified, setVerified] = useState("");
	const sequence = useRef(0);
	const controller = useRef<AbortController | null>(null);
	useEffect(
		() => () => {
			sequence.current++;
			controller.current?.abort();
		},
		[],
	);
	const patch = (data: Partial<BookmarkInput>) => setForm((f) => ({ ...f, ...data }));
	const metadata = async () => {
		const url = validUrl(current.current.url);
		if (!url) {
			setError(l("invalidUrl"));
			return;
		}
		controller.current?.abort();
		const abort = new AbortController();
		controller.current = abort;
		const seq = ++sequence.current;
		const raw = current.current.url;
		setFetching(true);
		setError("");
		try {
			const result = await searchService.metadata(url, abort.signal);
			if (!metadataCurrent(seq, sequence.current, raw, current.current.url)) return;
			setForm((f) => ({
				...f,
				name: f.titleSource === "auto" ? (result.title || new URL(url).hostname).slice(0, 80) : f.name,
				iconUrl: f.iconSource === "auto" ? safeIcon(result.iconUrl) : f.iconUrl,
				metadataFetchedAt: result.fetchedAt,
			}));
			if (result.status !== "ok") setError(l("metadataFailed"));
		} catch {
			if (!abort.signal.aborted && seq === sequence.current) setError(l("metadataFailed"));
		} finally {
			if (seq === sequence.current) setFetching(false);
		}
	};
	const save = async () => {
		const url = validUrl(form.url);
		if (!url || !form.name.trim() || form.name.trim().length > 80) {
			setError(l("bookmarkInvalid"));
			return;
		}
		if (
			form.iconSource === "custom" &&
			form.iconUrl &&
			(form.iconUrl !== item?.iconUrl || item?.iconSource !== "custom") &&
			(verified !== form.iconUrl || !validUrl(form.iconUrl, true))
		) {
			setError(l("verifyImage"));
			return;
		}
		setBusy(true);
		setError("");
		try {
			const data = { ...form, url, name: form.name.trim() };
			if (item) await searchService.updateBookmark(item.id, { ...data, version: item.version });
			else await searchService.createBookmark(data);
			saved();
		} catch (e) {
			setError(errorMessage(e, l("saveFailed"), l("conflict")));
		} finally {
			setBusy(false);
		}
	};
	return (
		<SearchSheet title={item ? l("editBookmark") : l("addBookmark")} close={() => !busy && close()}>
			<div className="search-fields">
				<label>
					{l("website")}
					<input
						autoFocus
						type="url"
						maxLength={2048}
						value={form.url}
						placeholder="https://example.com"
						onChange={(e) => {
							sequence.current++;
							controller.current?.abort();
							setFetching(false);
							patch({
								url: e.target.value,
								metadataFetchedAt: null,
								...(form.iconSource === "auto" ? { iconUrl: null } : {}),
								...(form.titleSource === "auto" ? { name: "" } : {}),
							});
						}}
						onBlur={metadata}
					/>
				</label>
				<button type="button" disabled={fetching} onClick={metadata}>
					{fetching ? l("fetching") : l("fetchMetadata")}
				</button>
				<label>
					{l("name")}
					<input
						maxLength={80}
						value={form.name}
						onChange={(e) => patch({ name: e.target.value, titleSource: "custom" })}
					/>
				</label>
				<label className="search-check">
					<input
						type="checkbox"
						checked={form.titleSource === "auto"}
						onChange={(e) => {
							patch({ titleSource: e.target.checked ? "auto" : "custom" });
						}}
					/>
					{l("autoTitle")}
				</label>
				<label>
					{l("icon")}
					<select
						value={form.iconSource}
						onChange={(e) => {
							patch({ iconSource: e.target.value as "auto" | "custom", iconUrl: null });
							setVerified("");
							setPreview("");
						}}
					>
						<option value="auto">{l("autoIcon")}</option>
						<option value="custom">{l("customIcon")}</option>
					</select>
				</label>
				{form.iconSource === "custom" && (
					<>
						<label>
							{l("imageUrl")}
							<input
								type="url"
								maxLength={2048}
								value={form.iconUrl || ""}
								placeholder="https://…"
								onChange={(e) => {
									patch({ iconUrl: e.target.value || null });
									setVerified("");
									setPreview("");
								}}
							/>
						</label>
						<button
							type="button"
							onClick={() => {
								if (!validUrl(form.iconUrl || "", true)) {
									setError(l("invalidImage"));
									return;
								}
								setError("");
								setPreview(form.iconUrl!);
							}}
						>
							{l("preview")}
						</button>
						<button
							type="button"
							onClick={() => {
								patch({ iconUrl: null });
								setPreview("");
							}}
						>
							{l("removeImage")}
						</button>
					</>
				)}
				{(preview || (form.iconSource === "auto" && safeIcon(form.iconUrl))) && (
					<OnlineImage
						key={preview || form.iconUrl}
						url={preview || safeIcon(form.iconUrl)!}
						alt={form.name || l("icon")}
						className="search-icon-preview"
						onResult={(ok) => {
							if (preview) {
								setVerified(ok ? preview : "");
								if (!ok) setError(l("imageFailed"));
							}
						}}
					/>
				)}
			</div>
			{error && (
				<p role="alert" className="search-error">
					{error}
				</p>
			)}
			<div className="search-footer">
				<button disabled={busy} onClick={close}>
					{l("cancel")}
				</button>
				<GlassAction disabled={busy} onClick={save}>
					{busy ? l("saving") : l("save")}
				</GlassAction>
			</div>
		</SearchSheet>
	);
}
