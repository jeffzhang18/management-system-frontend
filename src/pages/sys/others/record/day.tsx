import { Button, Card, Flex, message, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { Icon } from "@/components/icon";
import { RecordFormModal } from "./record-form-modal";
import { RecordList } from "./record-list";
import { importRecords, loadRecords, loadThemes, newRecord, saveCustomThemes, saveRecords } from "./storage";
import { compareWorkRecords, type RecordThemeOption, type WorkRecord } from "./types";

export default function RecordDayPage() {
	const { t, i18n } = useTranslation();
	const { date = "" } = useParams();
	const navigate = useNavigate();
	const selectedDate = dayjs(date, "YYYY-MM-DD", true).isValid() ? dayjs(date) : dayjs();
	const [records, setRecords] = useState<WorkRecord[]>(loadRecords);
	const [themes, setThemes] = useState<RecordThemeOption[]>(loadThemes);
	const [createOpen, setCreateOpen] = useState(false);
	const dayRecords = records
		.filter((record) => record.date === selectedDate.format("YYYY-MM-DD"))
		.sort(compareWorkRecords);

	const updateRecords = (next: WorkRecord[]) => {
		setRecords(next);
		saveRecords(next);
	};
	const addTheme = (theme: RecordThemeOption) => {
		const next = [...themes, theme];
		setThemes(next);
		saveCustomThemes(next);
	};
	const deleteTheme = (value: string) => {
		const nextThemes = themes.filter((theme) => theme.value !== value);
		setThemes(nextThemes);
		saveCustomThemes(nextThemes);
		updateRecords(records.map((record) => (record.theme === value ? { ...record, theme: "other" } : record)));
	};
	const handleImport = async (file: File) => {
		try {
			const imported = importRecords(JSON.parse(await file.text()));
			if (!imported.length) throw new Error("empty");
			const ids = new Set(records.map(({ id }) => id));
			const fresh = imported.filter(({ id }) => !ids.has(id));
			updateRecords([...records, ...fresh]);
			message.success(t("sys.record.importSuccess", { count: fresh.length }));
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
					<Typography.Text type="secondary">
						{t("sys.record.dayRecordCount", { count: dayRecords.length })}
					</Typography.Text>
				</div>
				<Button
					type="primary"
					icon={<Icon icon="solar:add-circle-bold" size={18} />}
					onClick={() => setCreateOpen(true)}
				>
					{t("sys.record.new")}
				</Button>
			</Flex>
			<Card>
				<RecordList
					records={dayRecords}
					themes={themes}
					onSelect={(record) => navigate(`/record/detail/${record.id}`, { state: { from: "day" } })}
					onDelete={(id) => {
						updateRecords(records.filter((record) => record.id !== id));
						message.success(t("sys.record.recordDeleted"));
					}}
				/>
			</Card>
			<RecordFormModal
				open={createOpen}
				date={selectedDate}
				themes={themes}
				onCancel={() => setCreateOpen(false)}
				onAddTheme={addTheme}
				onDeleteTheme={deleteTheme}
				onImport={handleImport}
				onCreate={(value) => {
					updateRecords([...records, newRecord(value)]);
					setCreateOpen(false);
					message.success(t("sys.record.recordSaved"));
				}}
			/>
		</div>
	);
}
