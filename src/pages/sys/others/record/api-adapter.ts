import dayjs from "dayjs";
import type {
	CreateWorkRecordReq,
	WorkRecordCalendarSummaryItem,
	WorkRecordDetail,
	WorkRecordThemeDetail,
} from "@/api/services/workRecordService";
import type { RecordThemeOption, WorkRecord } from "./types";

export interface CalendarCellRecord {
	id: string;
	date: string;
	color: string;
}

const DEFAULT_THEME_COLOR = "#64748b";

const isValidDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeDate = (value: unknown): string => {
	if (isValidDate(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = dayjs(value);
		if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
	}
	return "";
};

const normalizeTimeValue = (value: unknown): string | undefined => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const matched = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed);
	if (!matched) return undefined;
	return `${matched[1]}:${matched[2]}`;
};

const normalizeTimeRange = (startTime?: string, endTime?: string) => {
	if (!startTime || !endTime) return { startTime: undefined, endTime: undefined };
	if (startTime >= endTime) return { startTime: undefined, endTime: undefined };
	return { startTime, endTime };
};

const toPlainObject = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const parseThemeId = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
	return undefined;
};

const normalizeThemeOption = (theme: WorkRecordThemeDetail): RecordThemeOption => ({
	value: String(theme.id),
	label: theme.themeName,
	color: theme.color || DEFAULT_THEME_COLOR,
	custom: !theme.isSystem,
	themeId: theme.id,
	themeKey: theme.themeKey,
});

export const mapThemeListToOptions = (themes: WorkRecordThemeDetail[]): RecordThemeOption[] =>
	themes.map(normalizeThemeOption);

export const mapWorkRecordDetail = (record: WorkRecordDetail): WorkRecord => {
	const startTime = normalizeTimeValue(record.startTime);
	const endTime = normalizeTimeValue(record.endTime);
	const normalizedRange = normalizeTimeRange(startTime, endTime);
	const normalizedDate = normalizeDate(record.recordDate);

	return {
		id: String(record.id),
		date: normalizedDate || dayjs(record.createdAt).format("YYYY-MM-DD"),
		title: record.title,
		description: record.contentMd ?? undefined,
		theme: record.theme ? String(record.theme.id) : "",
		themeId: record.theme?.id,
		themeName: record.theme?.themeName,
		themeColor: record.theme?.color,
		themeKey: record.theme?.themeKey,
		startTime: normalizedRange.startTime,
		endTime: normalizedRange.endTime,
		createdAt: record.createdAt,
	};
};

export const mapCalendarSummaryItem = (item: WorkRecordCalendarSummaryItem): CalendarCellRecord => {
	const normalizedDate = normalizeDate(item.recordDate);
	return {
		id: String(item.id),
		date: normalizedDate,
		color: item.color || DEFAULT_THEME_COLOR,
	};
};

export const resolveThemeIdByThemeValue = (themeValue?: string): number | undefined => {
	if (!themeValue) return undefined;
	return parseThemeId(themeValue);
};

const resolveThemeIdFromImportRecord = (raw: Record<string, unknown>, themes: RecordThemeOption[]) => {
	const byId = parseThemeId(raw.themeId);
	if (byId) return byId;

	const themeObject = toPlainObject(raw.theme);
	if (themeObject) {
		const nestedThemeId = parseThemeId(themeObject.id);
		if (nestedThemeId) return nestedThemeId;
	}

	if (typeof raw.theme === "string") {
		const normalized = raw.theme.trim();
		if (!normalized) return undefined;

		const fromValue = themes.find((item) => item.value === normalized);
		if (fromValue?.themeId) return fromValue.themeId;

		const fromLabel = themes.find((item) => item.label === normalized);
		if (fromLabel?.themeId) return fromLabel.themeId;

		const direct = parseThemeId(normalized);
		if (direct) return direct;
	}

	return undefined;
};

export const parseImportRecordsPayload = (
	payload: unknown,
	themes: RecordThemeOption[],
): CreateWorkRecordReq[] => {
	const sourceRecords: unknown[] = Array.isArray(payload)
		? payload
		: toPlainObject(payload) && Array.isArray((payload as { records?: unknown[] }).records)
			? ((payload as { records: unknown[] }).records ?? [])
			: [];

	const result: CreateWorkRecordReq[] = [];

	for (const item of sourceRecords) {
		const raw = toPlainObject(item);
		if (!raw) continue;

		const recordDateSource = raw.recordDate ?? raw.date;
		const titleSource = raw.title;

		if (!isValidDate(recordDateSource) || typeof titleSource !== "string" || !titleSource.trim()) continue;

		const startTime = normalizeTimeValue(raw.startTime);
		const endTime = normalizeTimeValue(raw.endTime);
		const normalizedRange = normalizeTimeRange(startTime, endTime);
		const themeId = resolveThemeIdFromImportRecord(raw, themes);

		const contentSource = raw.contentMd ?? raw.description;
		const contentMd = typeof contentSource === "string" && contentSource.trim() ? contentSource : undefined;

		result.push({
			recordDate: recordDateSource,
			title: titleSource.trim(),
			themeId,
			startTime: normalizedRange.startTime,
			endTime: normalizedRange.endTime,
			contentMd,
		});
	}

	return result;
};

