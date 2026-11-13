import type { Engine, SearchResult } from "@/api/services/searchService";
import { validUrl } from "./logic";

/** Private searches never send the query to the application's history endpoint. */
export function resolveSearch(
	query: string,
	engine: Engine,
	incognito: boolean,
	record: () => Promise<SearchResult>,
): Promise<{ targetUrl: string }> {
	if (!query.trim()) {
		const homepages: Record<Engine, string> = {
			google: "https://www.google.com/",
			baidu: "https://www.baidu.com/",
			bing: "https://www.bing.com/",
		};
		return Promise.resolve({ targetUrl: homepages[engine] });
	}
	if (!incognito) return record();
	const destinations: Record<Engine, [string, string]> = {
		google: ["https://www.google.com/search", "q"],
		baidu: ["https://www.baidu.com/s", "wd"],
		bing: ["https://www.bing.com/search", "q"],
	};
	const [base, parameter] = destinations[engine];
	const target = new URL(base);
	target.searchParams.set(parameter, query.trim());
	return Promise.resolve({ targetUrl: target.href });
}
export interface ReservedWindow {
	closed: boolean;
	close: () => void;
	location: { replace: (url: string) => void };
}
/** The caller reserves a window synchronously in the user gesture, before recording. */
export async function recordThenNavigate({
	record,
	popup,
	newTab,
	navigate,
	active,
}: {
	record: () => Promise<{ targetUrl: string }>;
	popup: ReservedWindow | null;
	newTab: boolean;
	navigate: (url: string) => void;
	active: () => boolean;
}): Promise<string | null> {
	try {
		const result = await record();
		if (!active()) {
			popup?.close();
			return null;
		}
		const target = validUrl(result.targetUrl);
		if (!target) throw new Error("Invalid search destination");
		if (!newTab) navigate(target);
		else if (popup && !popup.closed) popup.location.replace(target);
		else return target;
		return null;
	} catch (error) {
		popup?.close();
		throw error;
	}
}
