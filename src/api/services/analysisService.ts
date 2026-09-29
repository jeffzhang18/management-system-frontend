import apiClient from "@/api/apiClient";

export type PageViewsQuery = {
	startDate: string;
	endDate: string;
};

export interface DailyPageViews {
	date: string;
	pageViews: number;
	totalTimeOnPageMs: number;
	averageTimeOnPageMs: number;
}

export interface PageViewsSummary {
	totalPageViews: number;
	averageDailyPageViews: number;
	totalTimeOnPageMs: number;
	averageTimeOnPageMs: number;
}

export interface PageViewsResponse {
	daily: DailyPageViews[];
	summary: PageViewsSummary;
	period: {
		startDate: string;
		endDate: string;
		timezone: "Asia/Shanghai";
	};
}

const AnalysisApi = {
	PageViews: "/analysis/page-views",
} as const;

const getPageViews = (params: PageViewsQuery, suppressErrorToast = false) =>
	apiClient.get<PageViewsResponse>({
		url: AnalysisApi.PageViews,
		params,
		suppressErrorToast,
	});

export default {
	getPageViews,
};
