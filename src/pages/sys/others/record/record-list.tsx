import { Button, Empty, List, Popconfirm, Space, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { getRecordTheme, getRecordThemeLabel, type RecordThemeOption, type WorkRecord } from "./types";

interface Props {
	records: WorkRecord[];
	themes: RecordThemeOption[];
	onSelect: (record: WorkRecord) => void;
	onDelete: (id: string) => void;
}

export function RecordList({ records, themes, onSelect, onDelete }: Props) {
	const { t } = useTranslation();
	if (!records.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("sys.record.emptyDay")} />;
	return (
		<List
			dataSource={records}
			renderItem={(record) => {
				const theme = getRecordTheme(record.theme, themes);
				return (
					<List.Item
						actions={[
							<Popconfirm
								key="delete"
								title={t("sys.record.deleteRecordConfirm")}
								onConfirm={(event) => {
									event?.stopPropagation();
									onDelete(record.id);
								}}
							>
								<Button
									type="text"
									danger
									icon={<Icon icon="solar:trash-bin-trash-bold-duotone" size={18} />}
									onClick={(event) => event.stopPropagation()}
									aria-label={t("sys.record.deleteRecord")}
								/>
							</Popconfirm>,
						]}
						onClick={() => onSelect(record)}
						style={{ cursor: "pointer" }}
					>
						<List.Item.Meta
							title={
								<Space>
									<Tag color={theme.color}>{getRecordThemeLabel(theme, t)}</Tag>
									<Typography.Text>{record.title}</Typography.Text>
								</Space>
							}
							description={`${record.startTime ? (record.endTime ? `${record.startTime} - ${record.endTime}` : t("sys.record.fromTime", { time: record.startTime })) : t("sys.record.allDay")}${record.description ? ` · ${record.description.replace(/[#*`>_~[\]()-]/g, "").slice(0, 80)}` : ""}`}
						/>
					</List.Item>
				);
			}}
		/>
	);
}
