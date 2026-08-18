import { Button, Card, Flex, message, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import type { CreateWorkRecordReq } from "@/api/services/workRecordService";
import workRecordService from "@/api/services/workRecordService";
import { Icon } from "@/components/icon";
import { mapWorkRecordDetail, mergeThemesFromRecords, parseImportRecordsPayload } from "./api-adapter";
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
			setThemes((previous) => mergeThemesFromRecords(normalized, previous));
		} finally {
			setLoading(false);
		}
	}, [selectedDateKey]);

	useEffect(() => {
		void loadDayRecords();
	}, [loadDayRecords]);

	const handleCreate = async (value: CreateRecordFormPayload) => {
		const payload: CreateWorkRecordReq = {
			recordDate: value.date,
			title: value.title,
			contentMd: value.description,
			startTime: value.startTime,
			endTime: value.endTime,
		};

		if (value.theme && /^\d+$/.test(value.theme)) {
			payload.themeId = Number(value.theme);
		}

		await workRecordService.createRecord(payload);
		setCreateOpen(false);
		message.success(t("sys.record.recordSaved"));
		await loadDayRecords();
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

	const handleImport = async (file: File) => {
		try {
			const raw = JSON.parse(await file.text()) as unknown;
			const recordsToImport = parseImportRecordsPayload(raw, themes);
			if (!recordsToImport.length) throw new Error("empty");

			const result = await workRecordService.importRecords({ records: recordsToImport });
			message.success(t("sys.record.importSuccess", { count: result.succeeded }));
			await loadDayRecords();
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
				onImport={handleImport}
				onCreate={handleCreate}
			/>
		</div>
	);
}
