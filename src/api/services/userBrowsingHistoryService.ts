import apiClient from "@/api/apiClient";

export interface UserBrowsingHistoryPayload {
	pageUrl: string;
	device: string;
}

enum UserBrowsingHistoryApi {
	Create = "/sys/user-browsing-history",
}

const create = (payload: UserBrowsingHistoryPayload) =>
	apiClient.post<void>({
		url: UserBrowsingHistoryApi.Create,
		data: payload,
	});

export default {
	create,
};
