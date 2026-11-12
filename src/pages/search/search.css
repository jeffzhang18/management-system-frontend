import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Pencil, Search, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import searchService, { type Bookmark, type Engine, type SearchSettings } from "@/api/services/searchService";
import { useUserInfo } from "@/store/userStore";
import { GlassAction, GlassPanel } from "../subscriptions/glass";
import { BookmarkEditor } from "./bookmark-editor";
import { Bookmarks } from "./bookmarks";
import { History } from "./history";
import { canSubmit, defaults, move, SearchAttempt, validUrl } from "./logic";
import { OnlineImage, useLabels } from "./shared";
import { Settings } from "./settings";
import { recordThenNavigate } from "./submission";
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
	const effective = draft || settings.data || defaults;
	const [query, setQuery] = useState("");
	const [engine, setEngine] = useState<Engine>("google");
	const [editing, setEditing] = useState(false);
	const [editor, setEditor] = useState<Bookmark | "new" | null>(null);
	const [history, setHistory] = useState(false);
	const [pending, setPending] = useState(false);
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
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			reserved.current?.close();
		};
	}, []);
	useEffect(() => {
		if (settings.data) setEngine(settings.data.defaultEngine);
	}, [settings.data?.defaultEngine]);
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
				record: () => searchService.search(q, selected, requestId),
				popup,
				newTab: effective.openInNewTab,
				navigate: (url) => window.location.assign(url),
				active: () => alive.current,
			});
			if (alive.current) {
				client.invalidateQueries({ queryKey: [...key, "history"] });
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
		<section className="search-page" aria-label={l("pageTitle")}>
			{effective.backgroundMode === "online" && effective.wallpaperUrl && validUrl(effective.wallpaperUrl, true) && (
				<OnlineImage key={effective.wallpaperUrl} url={effective.wallpaperUrl} alt="" className="search-wallpaper" />
			)}
			<div className="search-shade" style={{ opacity: effective.overlayOpacity }} />
			<div className="search-content">
				<div className="search-toolbar">
					<button title={l("history")} aria-label={l("history")} onClick={() => setHistory(true)}>
						<Clock3 size={20} />
					</button>
					<button
						title={l("editBookmarks")}
						aria-label={l("editBookmarks")}
						aria-pressed={editing}
						onClick={() => setEditing(!editing)}
					>
						<Pencil size={19} />
					</button>
					<button
						disabled={!settings.data}
						title={l("settings")}
						aria-label={l("settings")}
						onClick={() => setDraft({ ...settings.data! })}
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
							<select
								aria-label={l("engine")}
								value={engine}
								disabled={pending}
								onChange={(e) => {
									setEngine(e.target.value as Engine);
									setSearchFailed(false);
								}}
							>
								<option value="google">Google</option>
								<option value="baidu">{l("baidu")}</option>
								<option value="bing">Bing</option>
							</select>
							<input
								ref={input}
								aria-label={l("query")}
								placeholder={l("placeholder")}
								value={query}
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
							<button disabled={pending} onClick={() => submit(query, engine, true)}>
								{l("retry")}
							</button>
						)}
					</div>
				)}
				{fallback && (
					<div role="status" className="search-status">
						{l("popupBlocked")}{" "}
						<a href={fallback} target="_blank" rel="noopener noreferrer">
							{l("openResults")}
						</a>
					</div>
				)}
				{(settings.isError || bookmarks.isError) && (
					<div className="search-status" role="alert">
						{l("loadFailed")}
						<button
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
					<p role="status" className="search-empty">
						{l("loading")}
					</p>
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
						<button disabled={mutation} onClick={() => mutate(() => searchService.deleteBookmark(deleteItem.id))}>
							{l("delete")}
						</button>
						<button disabled={mutation} onClick={() => setDeleteItem(null)}>
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
