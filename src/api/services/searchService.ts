import apiClient from "../apiClient";

export type Engine = "google" | "baidu" | "bing";
export interface SearchSettings {
	version: number;
	defaultEngine: Engine;
	openInNewTab: boolean;
	backgroundMode: "default" | "gradient" | "online";
	gradientFrom: string;
	gradientTo: string;
	gradientAngle: number;
	wallpaperUrl: string | null;
	overlayOpacity: number;
	iconSize: number;
	gap: number;
	radius: number;
	layoutDirection: "row" | "column";
	itemsPerLine: number;
}
export interface BookmarkInput {
	name: string;
	url: string;
	titleSource: "auto" | "custom";
	iconSource: "auto" | "custom";
	iconUrl: string | null;
	metadataFetchedAt: string | null;
}
export interface Bookmark extends BookmarkInput {
	id: string;
	sortOrder: number;
	version: number;
	createdAt: string;
	updatedAt: string;
}
export interface Metadata {
	url: string;
	title: string | null;
	iconUrl: string | null;
	fetchedAt: string;
	status: "ok" | "unavailable";
	message?: string;
}
export interface SearchHistory {
	id: string;
	query: string;
	engine: Engine;
	targetUrl: string;
	targetHost: string;
	source: string;
	createdAt: string;
}
export interface SearchResult {
	historyId: string;
	targetUrl: string;
	createdAt: string;
}
const request = <T>(method: string, path: string, data?: unknown) =>
	apiClient.request<T>({ method, url: `/search/${path}`, data, suppressErrorToast: true });
const searchService = {
	settings: () => request<SearchSettings>("GET", "settings"),
	saveSettings: (data: Partial<SearchSettings> & { version: number }) =>
		request<SearchSettings>("PATCH", "settings", data),
	bookmarks: () => request<{ items: Bookmark[] }>("GET", "bookmarks"),
	createBookmark: (data: BookmarkInput) => request<Bookmark>("POST", "bookmarks", data),
	updateBookmark: (id: string, data: BookmarkInput & { version: number }) =>
		request<Bookmark>("PATCH", `bookmarks/${id}`, data),
	deleteBookmark: (id: string) => request<{ id: string }>("DELETE", `bookmarks/${id}`),
	order: (ids: string[]) => request<{ items: Bookmark[] }>("PUT", "bookmarks/order", { ids }),
	metadata: (url: string, signal?: AbortSignal) =>
		apiClient.post<Metadata>({ url: "/search/metadata", data: { url }, signal, suppressErrorToast: true }),
	search: (query: string, engine: Engine, requestId: string) =>
		request<SearchResult>("POST", "searches", { query, engine, requestId, source: "/search" }),
	history: (cursor?: string) =>
		apiClient.get<{ items: SearchHistory[]; nextCursor: string | null }>({
			url: "/search/history",
			params: { limit: 20, cursor },
			suppressErrorToast: true,
		}),
	deleteHistory: (id: string) => request<{ id: string }>("DELETE", `history/${id}`),
	clearHistory: () => request<{ deletedCount: number }>("DELETE", "history"),
};
export default searchService;
