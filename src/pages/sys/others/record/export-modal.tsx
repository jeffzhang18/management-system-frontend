import { DatePicker, Flex, Modal, Switch, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";
import type { ExportFormat } from "./export-records";

const FORMATS: Array<{ value: ExportFormat; title: string; descriptionKey: string; icon: string }> = [
	{
		value: "txt",
		title: "TXT",
		descriptionKey: "sys.record.export.plainText",
		icon: "solar:document-text-bold-duotone",
	},
	{
		value: "pdf",
		title: "PDF",
		descriptionKey: "sys.record.export.printPreview",
		icon: "solar:file-text-bold-duotone",
	},
	{
		value: "json",
		title: "JSON",
		descriptionKey: "sys.record.export.reimportable",
		icon: "solar:code-file-bold-duotone",
	},
	{
		value: "ai",
		title: "AI",
		descriptionKey: "sys.record.export.aiSummary",
		icon: "solar:magic-stick-3-bold-duotone",
	},
];

interface Props {
	open: boolean;
	range: [Dayjs, Dayjs];
	format: ExportFormat;
	count: number;
	loading?: boolean;
	includeNextWeekPlan: boolean;
	onRangeChange: (range: [Dayjs, Dayjs]) => void;
	onFormatChange: (format: ExportFormat) => void;
	onIncludeNextWeekPlanChange: (checked: boolean) => void;
	onCancel: () => void;
	onExport: () => void;
}

export function ExportModal({ open, range, format, count, loading = false, includeNextWeekPlan, onRangeChange, onFormatChange, onIncludeNextWeekPlanChange, onCancel, onExport }: Props) {
	const { t } = useTranslation();
	return (
		<Modal title={t("sys.record.export.title")} open={open} onCancel={onCancel} footer={null} width={540} centered>
			<Typography.Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 22 }}>
				{t("sys.record.export.subtitle")}
			</Typography.Paragraph>
			<Flex gap={16}>
				<DateField>
					<Typography.Text>{t("sys.record.export.startDate")}</Typography.Text>
					<DatePicker
						value={range[0]}
						onChange={(date) => date && onRangeChange([date, range[1]])}
						allowClear={false}
						format="YYYY/MM/DD"
					/>
				</DateField>
				<DateField>
					<Typography.Text>{t("sys.record.export.endDate")}</Typography.Text>
					<DatePicker
						value={range[1]}
						onChange={(date) => date && onRangeChange([range[0], date])}
						allowClear={false}
						format="YYYY/MM/DD"
					/>
				</DateField>
			</Flex>
			<Typography.Text style={{ display: "block", margin: "20px 0 10px" }}>
				{t("sys.record.export.format")}
			</Typography.Text>
			<FormatGrid>
				{FORMATS.map((item) => (
					<FormatButton
						key={item.value}
						type="button"
						$active={format === item.value}
						onClick={() => onFormatChange(item.value)}
					>
						<Icon icon={item.icon} size={22} />
						<strong>{item.title}</strong>
						<span>{t(item.descriptionKey)}</span>
					</FormatButton>
				))}
			</FormatGrid>
			<RecordCount>
				<span>{t("sys.record.export.rangeCount", { count })}</span>
				{format === "ai" && (
					<NextWeekPlanToggle>
						<span>{t("sys.record.export.includeNextWeekPlan")}</span>
						<Switch
							size="small"
							checked={includeNextWeekPlan}
							onChange={onIncludeNextWeekPlanChange}
							aria-label={t("sys.record.export.includeNextWeekPlan")}
						/>
					</NextWeekPlanToggle>
				)}
			</RecordCount>
			<Button size="lg" className="w-full" disabled={loading} onClick={onExport}>
				<Icon icon="solar:download-minimalistic-bold" size={20} />
				{loading ? t("sys.record.export.generating") : t("sys.record.export.action")}
			</Button>
		</Modal>
	);
}

const DateField = styled.div`display: flex; flex: 1; flex-direction: column; gap: 8px; .ant-picker { width: 100%; height: 46px; }`;
const FormatGrid = styled.div`display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;`;
const FormatButton = styled(Button)<{
	$active: boolean;
}>`display: flex; height: auto; min-height: 88px; padding: 10px 8px; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: ${({ $active }) => ($active ? themeVars.colors.palette.primary.default : themeVars.colors.text.primary)}; border: 1px solid ${({ $active }) => ($active ? themeVars.colors.palette.primary.default : "#d9d9d9")}; border-radius: 10px; background: ${({ $active }) => ($active ? `color-mix(in srgb, ${themeVars.colors.palette.primary.default} 16%, white)` : "transparent")}; box-shadow: none; cursor: pointer; transition: 160ms ease; strong { font-size: 15px; } span { color: ${themeVars.colors.text.secondary}; font-size: 12px; } &:hover { border-color: ${themeVars.colors.palette.primary.default}; transform: translateY(-1px); }`;
const RecordCount = styled.div`display: flex; min-height: 32px; align-items: center; justify-content: space-between; gap: 16px; margin: 16px 0; color: ${themeVars.colors.text.secondary};`;
const NextWeekPlanToggle = styled.label`display: inline-flex; align-items: center; gap: 8px; color: ${themeVars.colors.text.primary}; font-size: 13px; cursor: pointer;`;
