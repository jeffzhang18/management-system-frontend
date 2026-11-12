import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";
import searchService, { type Engine, type SearchHistory } from "@/api/services/searchService";
import { SearchSheet, useLabels } from "./shared";

export function History({
	userId,
	close,
	search,
}: {
	userId?: string;
	close: () => void;
	search: (item: SearchHistory) => void;
}) {
	const l = useLabels();
	const client = useQueryClient();
	const queryKey = ["search", userId, "history"];
	const history = useInfiniteQuery({
		queryKey,
		queryFn: ({ pageParam }) => searchService.history(pageParam),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		retry: false,
	});
	const [busy, setBusy] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [error, setError] = useState("");
	const engines: Record<Engine, string> = { google: "Google", baidu: l("baidu"), bing: "Bing" };
	const run = async (operation: () => Promise<unknown>) => {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			await operation();
			setConfirming(false);
			await client.invalidateQueries({ queryKey });
		} catch {
			setError(l("saveFailed"));
		} finally {
			setBusy(false);
		}
	};
	const items = history.data?.pages.flatMap((page) => page.items) ?? [];
	return (
		<SearchSheet title={l("history")} close={() => !busy && close()}>
			<p className="search-help">{l("historyHelp")}</p>
			{history.isPending ? (
				<p role="status" className="search-empty">
					{l("loading")}
				</p>
			) : history.isError ? (
				<div role="alert" className="search-error">
					{l("loadFailed")}{" "}
					<button type="button" onClick={() => history.refetch()}>
						{l("retry")}
					</button>
				</div>
			) : !items.length ? (
				<p className="search-empty">{l("emptyHistory")}</p>
			) : (
				<ul className="search-history">
					{items.map((item) => (
						<li key={item.id} className="search-history-item">
							<div className="search-history-text">
								<strong>{item.query}</strong>
								<span>
									{engines[item.engine] ?? item.engine} · {new Date(item.createdAt).toLocaleString()}
								</span>
							</div>
							<button
								type="button"
								disabled={busy}
								title={l("searchAgain")}
								aria-label={`${l("searchAgain")} ${item.query}`}
								onClick={() => search(item)}
							>
								<Search size={16} />
							</button>
							<button
								type="button"
								disabled={busy}
								title={l("delete")}
								aria-label={`${l("delete")} ${item.query}`}
								onClick={() => run(() => searchService.deleteHistory(item.id))}
							>
								<Trash2 size={16} />
							</button>
						</li>
					))}
				</ul>
			)}
			{history.hasNextPage && (
				<button
					type="button"
					className="search-load-more"
					disabled={history.isFetchingNextPage}
					onClick={() => history.fetchNextPage()}
				>
					{history.isFetchingNextPage ? l("loading") : l("loadMore")}
				</button>
			)}
			{error && (
				<p role="alert" className="search-error">
					{error}
				</p>
			)}
			{items.length > 0 && (
				<div className="search-footer">
					{confirming ? (
						<>
							<p className="search-help">{l("confirmClear")}</p>
							<button type="button" disabled={busy} onClick={() => setConfirming(false)}>
								{l("cancel")}
							</button>
							<button type="button" disabled={busy} onClick={() => run(() => searchService.clearHistory())}>
								{l("confirm")}
							</button>
						</>
					) : (
						<button type="button" disabled={busy} onClick={() => setConfirming(true)}>
							{l("clearHistory")}
						</button>
					)}
				</div>
			)}
		</SearchSheet>
	);
}
