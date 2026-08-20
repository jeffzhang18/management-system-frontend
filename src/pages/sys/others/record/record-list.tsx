import { Button, Empty, List, Popconfirm, Space, Tag, Typography } from "antd";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { getRecordTheme, getRecordThemeLabel, type RecordThemeOption, type WorkRecord } from "./types";

interface Props {
	records: WorkRecord[];
	themes: RecordThemeOption[];
	onSelect: (record: WorkRecord) => void;
	onDelete: (id: string) => void;
	enablePagination?: boolean;
	pageSize?: number;
}

const RecordList = ({ records, themes, onSelect, onDelete, enablePagination = false, pageSize = 8 }: Props) => {
	const { t } = useTranslation();
	if (!records.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("sys.record.emptyDay")} />;

	return (
		<ListContainer>
			<List
				className="record-list"
				pagination={
					enablePagination
						? { pageSize, size: "small", hideOnSinglePage: true, showSizeChanger: false }
						: false
				}
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
										size="small"
										danger
										icon={<Icon icon="solar:trash-bin-trash-bold-duotone" size={16} />}
										onClick={(event) => event.stopPropagation()}
										aria-label={t("sys.record.deleteRecord")}
										style={{ width: 20, minWidth: 20, paddingInline: 0 }}
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
										<Typography.Text strong>{record.title}</Typography.Text>
									</Space>
								}
								description={
									<Typography.Text style={{ display: "block", whiteSpace: "normal", wordBreak: "break-all", overflowWrap: "anywhere" }}>
										{`${record.startTime ? (record.endTime ? `${record.startTime} - ${record.endTime}` : t("sys.record.fromTime", { time: record.startTime })) : t("sys.record.allDay")}${record.description ? ` · ${record.description.replace(/[#*`>_~[\]()-]/g, "").slice(0, 200)}` : ""}`}
									</Typography.Text>
								}
							/>
						</List.Item>
					);
				}}
			/>
		</ListContainer>
	);
};

export { RecordList };
export default RecordList;

const ListContainer = styled.div`
	.record-list.ant-list .ant-list-item {
		align-items: flex-start;
	}
	.record-list.ant-list .ant-list-item-meta {
		min-width: 0;
		margin-inline-end: 0;
	}
	.record-list.ant-list .ant-list-item-action {
		width: 20px;
		flex: 0 0 20px;
		min-width: 20px;
		margin-inline-start: 2px;
		padding: 0;
	}
	.record-list.ant-list .ant-list-item-action > li {
		width: 20px;
		margin-inline: 0 !important;
		padding-inline: 0 !important;
	}
`;
