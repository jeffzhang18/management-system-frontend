import { GLOBAL_CONFIG } from "@/global-config";
import userStore from "@/store/userStore";
import apiClient from "../apiClient";

export interface WorkRecordThemeDetail {
	id: number;
	themeKey: string;
	themeName: string;
	color: string;
	isSystem: boolean;
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

enum WorkRecordApi {
	Calendar = "/work-records/calendar",
	Records = "/work-records",
	Export = "/work-records/export",
	Import = "/work-records/import",
}

const joinApiUrl = (path: string) => {
	const baseUrl = GLOBAL_CONFIG.apiBaseUrl.replace(/\/+$/g, "");
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	if (/^https?:\/\//i.test(baseUrl)) return `${baseUrl}${normalizedPath}`;
	if (typeof window !== "undefined") return `${window.location.origin}${baseUrl}${normalizedPath}`;
	return `${baseUrl}${normalizedPath}`;
};

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

const getRecordDetail = (id: string | number) => apiClient.get<WorkRecordDetail>({ url: `${WorkRecordApi.Records}/${id}` });

const createRecord = (data: CreateWorkRecordReq) => apiClient.post<WorkRecordDetail>({ url: WorkRecordApi.Records, data });

const deleteRecord = (id: string | number) => apiClient.delete<DeleteWorkRecordRes>({ url: `${WorkRecordApi.Records}/${id}` });

const importRecords = (data: ImportWorkRecordsReq | CreateWorkRecordReq[]) =>
	apiClient.post<ImportWorkRecordsRes>({ url: WorkRecordApi.Import, data });

const exportRecords = async ({ startDate, endDate, format = "json" }: ExportWorkRecordsReq): Promise<ExportWorkRecordsRes> => {
	const params = new URLSearchParams({ startDate, endDate, format });
	const accessToken = userStore.getState().userToken.accessToken;
	const response = await fetch(joinApiUrl(`${WorkRecordApi.Export}?${params.toString()}`), {
		method: "GET",
		headers: {
			...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
		},
	});

	if (!response.ok) {
		let message = `Failed to export work records (${response.status})`;
		try {
			const payload = (await response.json()) as { message?: string };
			if (payload?.message) message = payload.message;
		} catch {
			// ignore parse error
		}
		throw new Error(message);
	}

	const blob = await response.blob();
	const fallback = `work-records_${startDate}_${endDate}.${format}`;
	const fileName = parseFileName(response.headers.get("content-disposition"), fallback);
	const contentType = response.headers.get("content-type") || blob.type;

	return {
		blob,
		fileName,
		contentType,
	};
};

export default {
	getCalendarSummary,
	getRecordsByDate,
	getRecordDetail,
	createRecord,
	deleteRecord,
	importRecords,
	exportRecords,
};

