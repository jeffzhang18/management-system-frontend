import axios from "axios";
import { GLOBAL_CONFIG } from "@/global-config";
import userStore from "@/store/userStore";
import apiClient from "../apiClient";

export interface WorkRecordThemeDetail {
	id: number;
	themeKey: string;
	themeName: string;
	color: string;
	isSystem: boolean;
	sortNo?: number;
}

export interface CreateWorkRecordThemeReq {
	themeName: string;
	color: string;
	themeKey?: string;
	sortNo?: number;
}

export interface WorkRecordDetail {
	id: number;
	recordDate: string;
	title: string;
	startTime: string | null;
	endTime: string | null;
	contentMd: string | null;
	version: number;
	createdAt: string;
	updatedAt: string;
	theme: WorkRecordThemeDetail | null;
}

export interface WorkRecordCalendarSummaryItem {
	id: number;
	recordDate: string;
	color: string;
}

export interface WorkRecordContributionItem {
	date: string;
	records: number;
	level: 0 | 1 | 2 | 3 | 4;
}

export interface CreateWorkRecordReq {
	recordDate: string;
	title: string;
	themeId?: number;
	startTime?: string | null;
	endTime?: string | null;
	contentMd?: string | null;
}

export interface ImportWorkRecordsReq {
	records: CreateWorkRecordReq[];
}

export interface ImportWorkRecordsRes {
	total: number;
	succeeded: number;
	failed: number;
	createdIds: number[];
	errors: Array<{ index: number; reason: string }>;
}

export interface DeleteWorkRecordRes {
	id: number;
	deletedAt: string;
}

export interface ExportWorkRecordsReq {
	startDate: string;
	endDate: string;
	format?: "txt" | "json" | "pdf";
}

export interface ExportWorkRecordsRes {
	blob: Blob;
	fileName: string;
	contentType: string;
}

export interface CalendarRangeReq {
	startDate: string;
	endDate: string;
}

export interface GenerateAiReportReq extends CalendarRangeReq {
	reportType: "WEEKLY_REPORT" | "NEXT_WEEK_PLAN";
	outputFormat: "MARKDOWN";
	language: "zh-CN" | "en-US";
}

type GenerateAiReportRawRes =
	| string
	| {
			content?: string;
			markdown?: string;
			report?: string;
		};

enum WorkRecordApi {
	Calendar = "/work-records/calendar",
	Contributions = "/work-records/contributions",
	Records = "/work-records",
	Themes = "/work-records/themes",
	Export = "/work-records/export",
	Import = "/work-records/import",
	GenerateAiReport = "/work-records/ai-report/generate",
}

const parseFileName = (contentDisposition: string | null, fallback: string) => {
	if (!contentDisposition) return fallback;
	const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1];
	if (utf8Name) {
		try {
			return decodeURIComponent(utf8Name).replace(/^"|"$/g, "");
		} catch {
			return utf8Name.replace(/^"|"$/g, "");
		}
	}
	const plainName = /filename=([^;]+)/i.exec(contentDisposition)?.[1];
	return plainName ? plainName.replace(/^"|"$/g, "") : fallback;
};

const getCalendarSummary = ({ startDate, endDate }: CalendarRangeReq) => {
	const params = new URLSearchParams({ startDate, endDate });
	return apiClient.get<WorkRecordCalendarSummaryItem[]>({ url: `${WorkRecordApi.Calendar}?${params.toString()}` });
};

const getRecordsByDate = (date: string) => {
	const params = new URLSearchParams({ date });
	return apiClient.get<WorkRecordDetail[]>({ url: `${WorkRecordApi.Records}?${params.toString()}` });
};

const getContributions = (year: number) => {
	const params = new URLSearchParams({ year: String(year) });
	return apiClient.get<WorkRecordContributionItem[]>({ url: `${WorkRecordApi.Contributions}?${params.toString()}` });
};

const getThemes = () => apiClient.get<WorkRecordThemeDetail[]>({ url: WorkRecordApi.Themes });

const createTheme = (data: CreateWorkRecordThemeReq) =>
	apiClient.post<WorkRecordThemeDetail>({ url: WorkRecordApi.Themes, data });

const getRecordDetail = (id: string | number) => apiClient.get<WorkRecordDetail>({ url: `${WorkRecordApi.Records}/${id}` });

const createRecord = (data: CreateWorkRecordReq) => apiClient.post<WorkRecordDetail>({ url: WorkRecordApi.Records, data });

const deleteRecord = (id: string | number) => apiClient.delete<DeleteWorkRecordRes>({ url: `${WorkRecordApi.Records}/${id}` });

const importRecords = (data: ImportWorkRecordsReq | CreateWorkRecordReq[]) =>
	apiClient.post<ImportWorkRecordsRes>({ url: WorkRecordApi.Import, data });

const generateAiReport = async (data: GenerateAiReportReq) => {
	const response = await apiClient.post<GenerateAiReportRawRes>({ url: WorkRecordApi.GenerateAiReport, data });
	if (typeof response === "string") return response;
	return response.content ?? response.markdown ?? response.report ?? "";
};

const exportRecords = async ({ startDate, endDate, format = "json" }: ExportWorkRecordsReq): Promise<ExportWorkRecordsRes> => {
	const accessToken = userStore.getState().userToken.accessToken;
	let response;
	try {
		response = await axios.get<Blob>(WorkRecordApi.Export, {
			baseURL: GLOBAL_CONFIG.apiBaseUrl,
			params: { startDate, endDate, format },
			responseType: "blob",
			headers: accessToken
				? {
					Authorization: `Bearer ${accessToken}`,
				}
				: undefined,
		});
	} catch (error) {
		let message = "Failed to export work records";
		if (axios.isAxiosError(error)) {
			message = `Failed to export work records (${error.response?.status ?? "network"})`;
			const blob = error.response?.data;
			if (blob instanceof Blob) {
				try {
					const payload = JSON.parse(await blob.text()) as { message?: string };
					if (payload?.message) message = payload.message;
				} catch {
					// ignore parse error
				}
			}
		}
		throw new Error(message);
	}

	const blob = response.data;
	const fallback = `work-records_${startDate}_${endDate}.${format}`;
	const fileName = parseFileName((response.headers["content-disposition"] as string | null) ?? null, fallback);
	const contentType = (response.headers["content-type"] as string | undefined) || blob.type;

	return {
		blob,
		fileName,
		contentType,
	};
};

export default {
	getCalendarSummary,
	getContributions,
	getRecordsByDate,
	getThemes,
	createTheme,
	getRecordDetail,
	createRecord,
	deleteRecord,
	importRecords,
	generateAiReport,
	exportRecords,
};

