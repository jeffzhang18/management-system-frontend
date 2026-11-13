import { GlassInput, GlassSwitch } from "@zakisheriff/liquid-glass";
import { useEffect, useRef, useState } from "react";
import searchService, { type Bookmark, type BookmarkInput } from "@/api/services/searchService";
import { GlassAction } from "../subscriptions/glass";
import { errorMessage, metadataCurrent, normalizeWebsiteUrl, safeIcon, validUrl } from "./logic";
import { OnlineImage, SearchSelect, SearchSheet, useLabels } from "./shared";
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
		const url = normalizeWebsiteUrl(current.current.url);
		if (!url) {
			setError(l("invalidUrl"));
			return;
		}
		controller.current?.abort();
		const abort = new AbortController();
		controller.current = abort;
		const seq = ++sequence.current;
		current.current = { ...current.current, url };
		setForm((f) => ({ ...f, url }));
		setFetching(true);
		setError("");
		try {
			const result = await searchService.metadata(url, abort.signal);
			if (!metadataCurrent(seq, sequence.current, url, current.current.url)) return;
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
		const url = normalizeWebsiteUrl(form.url);
		const name = form.name.trim() || (form.titleSource === "auto" && url ? new URL(url).hostname : "");
		if (!url || !name || name.length > 80) {
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
			const data = { ...form, url, name };
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
		<SearchSheet
			title={item ? l("editBookmark") : l("addBookmark")}
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
			<fieldset className="search-form search-fields" disabled={busy}>
				<div className="search-field">
					<span>{l("website")}</span>
					<GlassInput
						intensity={1}
						aria-label={l("website")}
						autoFocus
						type="url"
						maxLength={2048}
						value={form.url}
						placeholder="bing.com / https://bing.com"
						onChange={(e) => {
							sequence.current++;
							controller.current?.abort();
							setFetching(false);
							setError("");
							patch({
								url: e.target.value,
								metadataFetchedAt: null,
								...(form.iconSource === "auto" ? { iconUrl: null } : {}),
								...(form.titleSource === "auto" ? { name: "" } : {}),
							});
						}}
						onBlur={metadata}
					/>
				</div>
				<button type="button" disabled={fetching} onClick={metadata}>
					{fetching ? l("fetching") : l("fetchMetadata")}
				</button>
				<div className="search-field">
					<span>{l("name")}</span>
					<GlassInput
						intensity={1}
						aria-label={l("name")}
						maxLength={80}
						value={form.name}
						onChange={(e) => patch({ name: e.target.value, titleSource: "custom" })}
					/>
				</div>
				<label className="search-check" htmlFor="search-bookmark-auto-title">
					<span>{l("autoTitle")}</span>
					<GlassSwitch
						id="search-bookmark-auto-title"
						intensity={1}
						tint="var(--primary)"
						aria-label={l("autoTitle")}
						checked={form.titleSource === "auto"}
						onChange={(checked) => {
							patch({ titleSource: checked ? "auto" : "custom" });
						}}
					/>
				</label>
				<div className="search-field">
					<span>{l("icon")}</span>
					<SearchSelect
						label={l("icon")}
						disabled={busy}
						value={form.iconSource}
						onChange={(iconSource) => {
							patch({ iconSource, iconUrl: null });
							setVerified("");
							setPreview("");
						}}
						options={[
							{ value: "auto", label: l("autoIcon") },
							{ value: "custom", label: l("customIcon") },
						]}
					/>
				</div>
				{form.iconSource === "custom" && (
					<>
						<div className="search-field">
							<span>{l("imageUrl")}</span>
							<GlassInput
								intensity={1}
								aria-label={l("imageUrl")}
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
						</div>
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
			</fieldset>
			{error && (
				<p role="alert" className="search-error">
					{error}
				</p>
			)}
		</SearchSheet>
	);
}
