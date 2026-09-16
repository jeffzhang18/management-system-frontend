import apiClient from "@/api/apiClient";
import { GLOBAL_CONFIG } from "@/global-config";

export type BrowsingHistoryEventType = "enter" | "heartbeat" | "leave";
export type BrowsingHistoryLeaveReason = "route_change" | "pagehide" | "logout";

export interface UserBrowsingHistoryReportPayload {
	pageViewId: string;
	pageUrl: string;
	eventType: BrowsingHistoryEventType;
	sequence: number;
	activeDurationMs: number;
	device: string;
	leaveReason?: BrowsingHistoryLeaveReason;
}

export interface UserBrowsingHistoryReportResponse {
	pageViewId: string;
	acceptedSequence: number;
	activeDurationMs: number;
	ended: boolean;
}

type ReportOptions = {
	keepalive?: boolean;
	accessToken?: string;
};

const REPORT_URL = "/sys/user-browsing-history";

const resolveReportUrl = () => {
	const baseUrl = GLOBAL_CONFIG.apiBaseUrl.replace(/\/$/, "");
	return `${baseUrl}${REPORT_URL}`;
};

const report = (payload: UserBrowsingHistoryReportPayload, options: ReportOptions = {}) => {
	if (!options.keepalive) {
		return apiClient.post<UserBrowsingHistoryReportResponse>({
			url: REPORT_URL,
			data: payload,
			suppressErrorToast: true,
		});
	}

	if (!options.accessToken) {
		return Promise.resolve(undefined);
	}

	return fetch(resolveReportUrl(), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${options.accessToken}`,
			"Content-Type": "application/json;charset=utf-8",
		},
		body: JSON.stringify(payload),
		keepalive: true,
	}).then((response) => {
		if (!response.ok) {
			throw new Error(`Browsing history report failed with ${response.status}`);
		}
		return undefined;
	});
};

export default {
	report,
};
