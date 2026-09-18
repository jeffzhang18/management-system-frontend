import apiClient from "@/api/apiClient";

export type AnalysisPeriodQuery =
	| { date: string; startDate?: never; endDate?: never }
	| { date?: never; startDate: string; endDate: string };

export interface AnalysisPeriod {
	startAt: string;
	endAt: string;
	timezone: "Asia/Shanghai";
}

export interface TotalPageViewsResponse extends AnalysisPeriod {
	totalPageViews: number;
}

export interface AverageTimeOnPageResponse extends AnalysisPeriod {
	pageViews: number;
	averageTimeOnPageMs: number;
	averageTimeOnPageSeconds: number;
}

const AnalysisApi = {
	TotalPageViews: "/analysis/total-page-views",
	AverageTimeOnPage: "/analysis/average-time-on-page",
} as const;

const getTotalPageViews = (params: AnalysisPeriodQuery, suppressErrorToast = false) =>
	apiClient.get<TotalPageViewsResponse>({
		url: AnalysisApi.TotalPageViews,
		params,
		suppressErrorToast,
	});

const getAverageTimeOnPage = (params: AnalysisPeriodQuery, suppressErrorToast = false) =>
	apiClient.get<AverageTimeOnPageResponse>({
		url: AnalysisApi.AverageTimeOnPage,
		params,
		suppressErrorToast,
	});

export default {
	getTotalPageViews,
	getAverageTimeOnPage,
};
