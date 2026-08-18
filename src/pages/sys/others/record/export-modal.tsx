import { Button, DatePicker, Flex, Modal, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";
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
];

interface Props {
	open: boolean;
	range: [Dayjs, Dayjs];
	format: ExportFormat;
	count: number;
	onRangeChange: (range: [Dayjs, Dayjs]) => void;
	onFormatChange: (format: ExportFormat) => void;
	onCancel: () => void;
	onExport: () => void;
}

export function ExportModal({ open, range, format, count, onRangeChange, onFormatChange, onCancel, onExport }: Props) {
	const { t } = useTranslation();
	return (
		<Modal title={t("sys.record.export.title")} open={open} onCancel={onCancel} footer={null} width={650}>
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
						<Icon icon={item.icon} size={28} />
						<strong>{item.title}</strong>
						<span>{t(item.descriptionKey)}</span>
					</FormatButton>
				))}
			</FormatGrid>
			<RecordCount>{t("sys.record.export.rangeCount", { count })}</RecordCount>
			<Button
				type="primary"
				size="large"
				block
				icon={<Icon icon="solar:download-minimalistic-bold" size={20} />}
				onClick={onExport}
			>
				{t("sys.record.export.action")}
			</Button>
			{format === "pdf" && (
				<Typography.Text type="secondary" style={{ display: "block", marginTop: 10, textAlign: "center" }}>
					{t("sys.record.export.pdfHint")}
				</Typography.Text>
			)}
		</Modal>
	);
}

const DateField = styled.div`display: flex; flex: 1; flex-direction: column; gap: 8px; .ant-picker { width: 100%; height: 46px; }`;
const FormatGrid = styled.div`display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;`;
const FormatButton = styled.button<{
	$active: boolean;
}>`display: flex; min-height: 130px; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: ${({ $active }) => ($active ? themeVars.colors.palette.primary.default : themeVars.colors.text.primary)}; border: 1px solid ${({ $active }) => ($active ? themeVars.colors.palette.primary.default : "#d9d9d9")}; border-radius: 14px; background: ${({ $active }) => ($active ? `color-mix(in srgb, ${themeVars.colors.palette.primary.default} 16%, white)` : "transparent")}; cursor: pointer; transition: 160ms ease; strong { font-size: 18px; } span { color: ${themeVars.colors.text.secondary}; } &:hover { border-color: ${themeVars.colors.palette.primary.default}; transform: translateY(-1px); }`;
const RecordCount = styled.div`margin: 22px 0; padding: 13px 16px; color: ${themeVars.colors.text.secondary}; border-radius: 10px; background: color-mix(in srgb, ${themeVars.colors.palette.primary.default} 8%, transparent);`;
