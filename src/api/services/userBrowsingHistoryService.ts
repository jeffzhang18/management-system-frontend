import { GLOBAL_CONFIG } from "@/global-config";

export interface UserBrowsingHistoryPayload {
	pageUrl: string;
	device: string;
}

enum UserBrowsingHistoryApi {
	Create = "/sys/user-browsing-history",
}

const joinApiUrl = (path: string) => {
	const baseUrl = GLOBAL_CONFIG.apiBaseUrl.replace(/\/+$/g, "");
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${normalizedPath}`;
};

const create = async (payload: UserBrowsingHistoryPayload, accessToken: string) => {
	await fetch(joinApiUrl(UserBrowsingHistoryApi.Create), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(payload),
		keepalive: true,
	});
};

export default {
	create,
};
