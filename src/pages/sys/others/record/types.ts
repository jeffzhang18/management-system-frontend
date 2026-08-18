export type RecordTheme = string;

export interface RecordThemeOption {
	value: RecordTheme;
	label: string;
	color: string;
	custom?: boolean;
}

export interface WorkRecord {
	id: string;
	date: string;
	title: string;
	description?: string;
	theme: RecordTheme;
	themeId?: number;
	themeName?: string;
	themeColor?: string;
	themeKey?: string;
	startTime?: string;
	endTime?: string;
	createdAt: string;
}

export const DEFAULT_RECORD_THEMES: RecordThemeOption[] = [
	{ value: "development", label: "开发", color: "#16a34a" },
	{ value: "meeting", label: "会议", color: "#2563eb" },
	{ value: "design", label: "设计", color: "#9333ea" },
	{ value: "research", label: "调研", color: "#ea580c" },
	{ value: "operations", label: "运维", color: "#0891b2" },
	{ value: "other", label: "其他", color: "#64748b" },
];

export const getRecordTheme = (value: RecordTheme, themes: RecordThemeOption[] = DEFAULT_RECORD_THEMES) =>
	themes.find((theme) => theme.value === value) ?? DEFAULT_RECORD_THEMES[DEFAULT_RECORD_THEMES.length - 1];

export const getRecordThemeLabel = (theme: RecordThemeOption, translate: (key: string) => string) =>
	theme.custom ? theme.label : translate(`sys.record.themes.${theme.value}`);

export const compareWorkRecords = (a: WorkRecord, b: WorkRecord) => {
	if (a.startTime && b.startTime)
		return a.startTime.localeCompare(b.startTime) || a.createdAt.localeCompare(b.createdAt);
	if (a.startTime) return -1;
	if (b.startTime) return 1;
	return a.createdAt.localeCompare(b.createdAt);
};
