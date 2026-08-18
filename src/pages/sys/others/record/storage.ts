import type { RecordThemeOption, WorkRecord } from "./types";
import { DEFAULT_RECORD_THEMES } from "./types";

const STORAGE_KEY = "management-system-work-records-v1";
const THEME_STORAGE_KEY = "management-system-work-record-themes-v1";

const createId = () => `record_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;

const normalizeRecord = (value: unknown): WorkRecord | null => {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const title = typeof record.title === "string" ? record.title.trim() : "";
	const date = typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) ? record.date : "";
	if (!title || !date) return null;

	return {
		id: typeof record.id === "string" ? record.id : createId(),
		date,
		title,
		description: typeof record.description === "string" ? record.description : undefined,
		theme: typeof record.theme === "string" && record.theme ? record.theme : "other",
		startTime: typeof record.startTime === "string" ? record.startTime : undefined,
		endTime: typeof record.endTime === "string" ? record.endTime : undefined,
		createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
	};
};

export const loadRecords = (): WorkRecord[] => {
	try {
		const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		return Array.isArray(value)
			? value.map(normalizeRecord).filter((record): record is WorkRecord => record !== null)
			: [];
	} catch {
		return [];
	}
};

export const saveRecords = (records: WorkRecord[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

export const loadThemes = (): RecordThemeOption[] => {
	try {
		const custom: unknown = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "[]");
		if (!Array.isArray(custom)) return DEFAULT_RECORD_THEMES;
		const valid = custom.filter(
			(theme): theme is RecordThemeOption =>
				Boolean(theme) &&
				typeof theme === "object" &&
				typeof theme.value === "string" &&
				typeof theme.label === "string" &&
				typeof theme.color === "string",
		);
		return [...DEFAULT_RECORD_THEMES, ...valid];
	} catch {
		return DEFAULT_RECORD_THEMES;
	}
};

export const saveCustomThemes = (themes: RecordThemeOption[]) =>
	localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes.filter(({ custom }) => custom)));

export const importRecords = (value: unknown): WorkRecord[] => {
	if (!Array.isArray(value)) return [];
	return value.map(normalizeRecord).filter((record): record is WorkRecord => record !== null);
};

export const newRecord = (record: Omit<WorkRecord, "id" | "createdAt">): WorkRecord => ({
	...record,
	id: createId(),
	createdAt: new Date().toISOString(),
});
