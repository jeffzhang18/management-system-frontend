import type {
	CreateWorkRecordReq,
	WorkRecordCalendarSummaryItem,
	WorkRecordDetail,
} from "@/api/services/workRecordService";
import type { RecordThemeOption, WorkRecord } from "./types";

export interface CalendarCellRecord {
	id: string;
	date: string;
	color: string;
}

const DEFAULT_THEME_COLOR = "#64748b";

const isValidDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

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

const resolveThemeId = (raw: Record<string, unknown>, themes: RecordThemeOption[]) => {
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
		if (fromValue) {
			const parsed = parseThemeId(fromValue.value);
			if (parsed) return parsed;
		}
		const fromLabel = themes.find((item) => item.label === normalized);
		if (fromLabel) {
			const parsed = parseThemeId(fromLabel.value);
			if (parsed) return parsed;
		}
		const direct = parseThemeId(normalized);
		if (direct) return direct;
	}

	return undefined;
};

export const mapWorkRecordDetail = (record: WorkRecordDetail): WorkRecord => {
	const startTime = normalizeTimeValue(record.startTime);
	const endTime = normalizeTimeValue(record.endTime);
	const normalizedRange = normalizeTimeRange(startTime, endTime);

	return {
		id: String(record.id),
		date: record.recordDate,
		title: record.title,
		description: record.contentMd ?? undefined,
		theme: record.theme ? String(record.theme.id) : "other",
		themeId: record.theme?.id,
		themeName: record.theme?.themeName,
		themeColor: record.theme?.color,
		themeKey: record.theme?.themeKey,
		startTime: normalizedRange.startTime,
		endTime: normalizedRange.endTime,
		createdAt: record.createdAt,
	};
};

export const mapCalendarSummaryItem = (item: WorkRecordCalendarSummaryItem): CalendarCellRecord => ({
	id: String(item.id),
	date: item.recordDate,
	color: item.color || DEFAULT_THEME_COLOR,
});

export const mergeThemesFromRecords = (
	records: WorkRecord[],
	currentThemes: RecordThemeOption[] = [],
): RecordThemeOption[] => {
	const merged = new Map<string, RecordThemeOption>();

	for (const theme of currentThemes) {
		merged.set(theme.value, theme);
	}

	for (const record of records) {
		if (!record.themeId || !record.themeName) continue;
		merged.set(String(record.themeId), {
			value: String(record.themeId),
			label: record.themeName,
			color: record.themeColor || DEFAULT_THEME_COLOR,
			custom: true,
		});
	}

	return [...merged.values()];
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
		const themeId = resolveThemeId(raw, themes);

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

