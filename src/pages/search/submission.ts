import type { SearchResult } from "@/api/services/searchService";
import { validUrl } from "./logic";
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
	record: () => Promise<SearchResult>;
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
