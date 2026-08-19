import { Button, Card, Flex, message, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import type { CreateWorkRecordReq } from "@/api/services/workRecordService";
import workRecordService from "@/api/services/workRecordService";
import { Icon } from "@/components/icon";
import {
	mapThemeListToOptions,
	mapWorkRecordDetail,
	parseImportRecordsPayload,
	resolveThemeIdByThemeValue,
} from "./api-adapter";
import { type CreateRecordFormPayload, RecordFormModal } from "./record-form-modal";
import { RecordList } from "./record-list";
import { compareWorkRecords, type RecordThemeOption, type WorkRecord } from "./types";

export default function RecordDayPage() {
	const { t, i18n } = useTranslation();
	const { date = "" } = useParams();
	const navigate = useNavigate();
	const selectedDate = useMemo(
		() => (dayjs(date, "YYYY-MM-DD", true).isValid() ? dayjs(date) : dayjs()),
		[date],
	);
	const selectedDateKey = selectedDate.format("YYYY-MM-DD");

	const [records, setRecords] = useState<WorkRecord[]>([]);
	const [themes, setThemes] = useState<RecordThemeOption[]>([]);
	const [loading, setLoading] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);

	const loadDayRecords = useCallback(async () => {
		setLoading(true);
		try {
			const data = await workRecordService.getRecordsByDate(selectedDateKey);
			const normalized = data.map(mapWorkRecordDetail).sort(compareWorkRecords);
			setRecords(normalized);
		} finally {
			setLoading(false);
		}
	}, [selectedDateKey]);

	const loadThemeList = useCallback(async () => {
		const themeList = await workRecordService.getThemes();
		setThemes(mapThemeListToOptions(themeList));
	}, []);

	useEffect(() => {
		void loadDayRecords();
	}, [loadDayRecords]);

	useEffect(() => {
		void loadThemeList();
	}, [loadThemeList]);

	const handleCreate = async (value: CreateRecordFormPayload) => {
		const selectedTheme = value.theme;
		const resolvedThemeId = resolveThemeIdByThemeValue(selectedTheme);
		const payload: CreateWorkRecordReq = {
			recordDate: value.date,
			title: value.title,
			contentMd: value.description,
			startTime: value.startTime,
			endTime: value.endTime,
		};

		if (resolvedThemeId) payload.themeId = resolvedThemeId;

		await workRecordService.createRecord(payload);

		setCreateOpen(false);
		message.success(t("sys.record.recordSaved"));
		await loadDayRecords();
		await loadThemeList();
	};

	const handleDelete = async (id: string) => {
		try {
			await workRecordService.deleteRecord(id);
			message.success(t("sys.record.recordDeleted"));
			await loadDayRecords();
		} catch {
			// handled by interceptor
		}
	};

	const addTheme = async (theme: RecordThemeOption) => {
		const created = await workRecordService.createTheme({
			themeName: theme.label,
			color: theme.color,
		});
		const createdOption = mapThemeListToOptions([created])[0];
		setThemes((previous) => {
			const filtered = previous.filter((item) => item.value !== createdOption.value);
			return [...filtered, createdOption];
		});
		return createdOption;
	};

	const handleImport = async (file: File) => {
		try {
			const raw = JSON.parse(await file.text()) as unknown;
			const recordsToImport = parseImportRecordsPayload(raw, themes);
			if (!recordsToImport.length) throw new Error("empty");

			const result = await workRecordService.importRecords({ records: recordsToImport });
			message.success(t("sys.record.importSuccess", { count: result.succeeded }));
			await loadDayRecords();
			await loadThemeList();
		} catch {
			message.error(t("sys.record.importFailed"));
		}

		return false;
	};

	return (
		<div>
			<Flex align="center" gap={12} style={{ marginBottom: 20 }}>
				<Button
					type="text"
					icon={<Icon icon="solar:arrow-left-linear" size={22} />}
					onClick={() => navigate("/record")}
					aria-label={t("sys.record.backCalendar")}
				/>
				<div style={{ flex: 1 }}>
					<Typography.Title level={3} style={{ margin: 0 }}>
						{i18n.resolvedLanguage === "zh_CN"
							? selectedDate.format("YYYY年 M月D日 · dddd")
							: selectedDate.format("MMMM D, YYYY · dddd")}
					</Typography.Title>
					<Typography.Text type="secondary">{t("sys.record.dayRecordCount", { count: records.length })}</Typography.Text>
				</div>
				<Button
					type="primary"
					icon={<Icon icon="solar:add-circle-bold" size={18} />}
					onClick={() => setCreateOpen(true)}
				>
					{t("sys.record.new")}
				</Button>
			</Flex>
			<Card loading={loading}>
				<RecordList
					records={records}
					themes={themes}
					onSelect={(record) => navigate(`/record/detail/${record.id}`, { state: { from: "day" } })}
					onDelete={(id) => {
						void handleDelete(id);
					}}
				/>
			</Card>
			<RecordFormModal
				open={createOpen}
				date={selectedDate}
				themes={themes}
				onCancel={() => setCreateOpen(false)}
				onAddTheme={addTheme}
				onImport={handleImport}
				onCreate={handleCreate}
			/>
		</div>
	);
}
