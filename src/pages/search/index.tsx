import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassInput, GlassSwitch } from "@zakisheriff/liquid-glass";
import { Clock3, Pencil, Search, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import searchService, { type Bookmark, type Engine, type SearchSettings } from "@/api/services/searchService";
import { useUserInfo } from "@/store/userStore";
import { GlassAction, GlassPanel } from "../subscriptions/glass";
import { BookmarkEditor } from "./bookmark-editor";
import { Bookmarks } from "./bookmarks";
import { History } from "./history";
import { canSubmit, defaults, lightGradient, move, SearchAttempt, validGradient, validUrl } from "./logic";
import { Settings } from "./settings";
import { EngineSelect, OnlineImage, useLabels } from "./shared";
import { recordThenNavigate, resolveSearch } from "./submission";
import "./search.css";
export default function SearchPage() {
	const user = useUserInfo();
	return <SearchContent key={user.id} userId={user.id} />;
}
function SearchContent({ userId }: { userId?: string }) {
	const l = useLabels();
	const client = useQueryClient();
	const key = ["search", userId];
	const settings = useQuery({ queryKey: [...key, "settings"], queryFn: searchService.settings, retry: false });
	const bookmarks = useQuery({ queryKey: [...key, "bookmarks"], queryFn: searchService.bookmarks, retry: false });
	const [draft, setDraft] = useState<SearchSettings | null>(null);
	const effective = { ...defaults, ...(draft || settings.data) };
	const gradient = validGradient(effective) ? effective : defaults;
	const light =
		effective.backgroundMode === "default" || (effective.backgroundMode === "gradient" && lightGradient(gradient));
	const [query, setQuery] = useState("");
	const [engine, setEngine] = useState<Engine>("google");
	const [editing, setEditing] = useState(false);
	const [editor, setEditor] = useState<Bookmark | "new" | null>(null);
	const [history, setHistory] = useState(false);
	const [pending, setPending] = useState(false);
	const [incognito, setIncognito] = useState(false);
	const [mutation, setMutation] = useState(false);
	const [error, setError] = useState("");
	const [searchFailed, setSearchFailed] = useState(false);
	const [fallback, setFallback] = useState("");
	const [deleteItem, setDeleteItem] = useState<Bookmark | null>(null);
	const composing = useRef(false);
	const submitting = useRef(false);
	const attempts = useRef(new SearchAttempt());
	const input = useRef<HTMLInputElement>(null);
	const alive = useRef(true);
	const reserved = useRef<Window | null>(null);
	const savedDefaultEngine = settings.data?.defaultEngine;
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			reserved.current?.close();
		};
	}, []);
	useEffect(() => {
		if (savedDefaultEngine) setEngine(savedDefaultEngine);
	}, [savedDefaultEngine]);
	const submit = async (text = query, selected = engine, retry = false) => {
		if (!canSubmit(text, composing.current, submitting.current)) return;
		const q = text.trim();
		const requestId = attempts.current.get(q, selected, retry, () => crypto.randomUUID());
		submitting.current = true;
		setPending(true);
		setError("");
		setFallback("");
		setSearchFailed(false);
		const popup = effective.openInNewTab ? window.open("about:blank", "_blank") : null;
		reserved.current = popup;
		if (popup) popup.opener = null;
		try {
			const target = await recordThenNavigate({
				record: () => resolveSearch(q, selected, incognito, () => searchService.search(q, selected, requestId)),
				popup,
				newTab: effective.openInNewTab,
				navigate: (url) => window.location.assign(url),
				active: () => alive.current,
			});
			if (alive.current) {
				if (!incognito) client.invalidateQueries({ queryKey: [...key, "history"] });
				if (target) setFallback(target);
			}
		} catch {
			popup?.close();
			if (alive.current) {
				setError(l("searchFailed"));
				setSearchFailed(true);
			}
		} finally {
			reserved.current = null;
			submitting.current = false;
			if (alive.current) setPending(false);
		}
	};
	const mutate = async (operation: () => Promise<unknown>) => {
		if (mutation) return;
		setMutation(true);
		setError("");
		try {
			await operation();
			await client.invalidateQueries({ queryKey: [...key, "bookmarks"] });
			setDeleteItem(null);
		} catch {
			setError(l("saveFailed"));
		} finally {
			setMutation(false);
		}
	};
	const items = bookmarks.data?.items || [];
	return (
		<section
			className="search-page"
			data-tone={light ? "light" : "dark"}
			aria-label={l("pageTitle")}
			style={{
				background:
					effective.backgroundMode === "gradient"
						? `linear-gradient(${gradient.gradientAngle}deg, ${gradient.gradientFrom}, ${gradient.gradientTo})`
						: effective.backgroundMode === "online"
							? "#172033"
							: "#fff",
			}}
		>
			<Helmet>
				<title>{l("pageTitle")}</title>
			</Helmet>
			{effective.backgroundMode === "online" && effective.wallpaperUrl && validUrl(effective.wallpaperUrl, true) && (
				<OnlineImage key={effective.wallpaperUrl} url={effective.wallpaperUrl} alt="" className="search-wallpaper" />
			)}
			{effective.backgroundMode === "online" && (
				<div className="search-shade" style={{ opacity: effective.overlayOpacity }} />
			)}
			<div className="search-content">
				<div className="search-toolbar">
					<label className="search-incognito" htmlFor="search-incognito-toggle" title={l("incognitoHelp")}>
						<span>{l("incognito")}</span>
						<GlassSwitch
							id="search-incognito-toggle"
							intensity={1}
							tint="var(--primary)"
							aria-label={l("incognito")}
							aria-describedby="search-incognito-help"
							checked={incognito}
							disabled={pending}
							onChange={(value) => {
								setIncognito(value);
								setFallback("");
								setSearchFailed(false);
								setError("");
							}}
						/>
					</label>
					<span id="search-incognito-help" className="sr-only">
						{l("incognitoHelp")}
					</span>
					<button type="button" title={l("history")} aria-label={l("history")} onClick={() => setHistory(true)}>
						<Clock3 size={20} />
					</button>
					<button
						type="button"
						title={l("editBookmarks")}
						aria-label={l("editBookmarks")}
						aria-pressed={editing}
						onClick={() => setEditing(!editing)}
					>
						<Pencil size={19} />
					</button>
					<button
						type="button"
						disabled={!settings.data}
						title={l("settings")}
						aria-label={l("settings")}
						onClick={() => settings.data && setDraft({ ...defaults, ...settings.data })}
					>
						<Settings2 size={20} />
					</button>
				</div>
				<div className="search-top">
					<h1 className="sr-only">{l("pageTitle")}</h1>
					<GlassPanel className="search-bar" padding="0" radius="24px">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								submit();
							}}
						>
							<EngineSelect
								value={engine}
								disabled={pending}
								className="search-engine"
								onChange={(value) => {
									setEngine(value);
									setSearchFailed(false);
								}}
							/>
							<GlassInput
								className="search-query"
								intensity={1}
								tint="var(--primary)"
								ref={input}
								aria-label={l("query")}
								placeholder={l("placeholder")}
								value={query}
								onClear={() => {
									setQuery("");
									setSearchFailed(false);
								}}
								maxLength={1000}
								disabled={pending}
								onChange={(e) => {
									setQuery(e.target.value);
									setSearchFailed(false);
								}}
								onCompositionStart={() => {
									composing.current = true;
								}}
								onCompositionEnd={() => {
									composing.current = false;
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" && (e.nativeEvent.isComposing || composing.current || e.keyCode === 229))
										e.preventDefault();
								}}
							/>
							<GlassAction type="submit" disabled={pending || !query.trim()} aria-label={l("search")}>
								<Search size={21} />
								<span className="search-submit-label">{pending ? l("saving") : l("search")}</span>
							</GlassAction>
						</form>
					</GlassPanel>
				</div>
				{error && (
					<div role="alert" className="search-status search-error">
						{error}
						{searchFailed && (
							<button type="button" disabled={pending} onClick={() => submit(query, engine, true)}>
								{l("retry")}
							</button>
						)}
					</div>
				)}
				{fallback && (
					<output className="search-status">
						{l("popupBlocked")}{" "}
						<a href={fallback} target="_blank" rel="noopener noreferrer">
							{l("openResults")}
						</a>
					</output>
				)}
				{(settings.isError || bookmarks.isError) && (
					<div className="search-status" role="alert">
						{l("loadFailed")}
						<button
							type="button"
							onClick={() => {
								settings.refetch();
								bookmarks.refetch();
							}}
						>
							{l("retry")}
						</button>
					</div>
				)}
				{bookmarks.isPending ? (
					<output className="search-empty">{l("loading")}</output>
				) : (
					<Bookmarks
						items={items}
						settings={effective}
						editing={editing}
						edit={setEditor}
						add={() => setEditor("new")}
						busy={mutation}
						remove={setDeleteItem}
						reorder={(from, to) => mutate(() => searchService.order(move(items, from, to).map((i) => i.id)))}
					/>
				)}
				{deleteItem && (
					<div className="search-status search-confirm" role="alert">
						<p>
							{l("confirmDelete")} {deleteItem.name}
						</p>
						<button
							type="button"
							disabled={mutation}
							onClick={() => mutate(() => searchService.deleteBookmark(deleteItem.id))}
						>
							{l("delete")}
						</button>
						<button type="button" disabled={mutation} onClick={() => setDeleteItem(null)}>
							{l("cancel")}
						</button>
					</div>
				)}
			</div>
			{draft && settings.data && (
				<Settings
					saved={settings.data}
					draft={draft}
					setDraft={setDraft}
					close={() => {
						setDraft(null);
						settings.refetch();
					}}
					onSaved={(saved) => {
						client.setQueryData([...key, "settings"], saved);
						setDraft(null);
					}}
				/>
			)}
			{editor && (
				<BookmarkEditor
					item={editor === "new" ? undefined : editor}
					close={() => {
						setEditor(null);
						bookmarks.refetch();
					}}
					saved={() => {
						client.invalidateQueries({ queryKey: [...key, "bookmarks"] });
						setEditor(null);
					}}
				/>
			)}
			{history && (
				<History
					userId={userId}
					close={() => setHistory(false)}
					search={(item) => {
						setQuery(item.query);
						setEngine(item.engine);
						setHistory(false);
						submit(item.query, item.engine);
					}}
				/>
			)}
		</section>
	);
}
