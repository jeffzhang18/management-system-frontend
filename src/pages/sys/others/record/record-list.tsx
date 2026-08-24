import { Empty, List, Popconfirm, Space, Tag, Typography } from "antd";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
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
		<ListContainer $pageSize={enablePagination ? pageSize : undefined}>
			<List
				className="record-list"
				data-paginated={enablePagination || undefined}
				data-single-page={(enablePagination && records.length <= pageSize) || undefined}
				pagination={
					enablePagination
						? { pageSize, size: "small", hideOnSinglePage: false, showSizeChanger: false }
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
									placement="topLeft"
									autoAdjustOverflow
									onCancel={(event) => event?.stopPropagation()}
									onConfirm={(event) => {
										event?.stopPropagation();
										onDelete(record.id);
									}}
								>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8 text-destructive hover:text-destructive"
									onClick={(event) => event.stopPropagation()}
									aria-label={t("sys.record.deleteRecord")}
								>
									<Icon icon="solar:trash-bin-trash-bold-duotone" size={16} />
								</Button>
								</Popconfirm>,
							]}
							onClick={() => onSelect(record)}
							style={{ cursor: "pointer" }}
						>
							<List.Item.Meta
								title={
									<Space className="record-list-title">
										<Tag color={theme.color}>{getRecordThemeLabel(theme, t)}</Tag>
										<Typography.Text strong ellipsis={{ tooltip: record.title }}>
											{record.title}
										</Typography.Text>
									</Space>
								}
								description={
									<Typography.Text className="record-list-description">
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

const ListContainer = styled.div<{ $pageSize?: number }>`
	display: flex;
	flex: 1;
	min-height: 0;

	.record-list.ant-list {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
	}
	.record-list.ant-list > .ant-spin-nested-loading,
	.record-list.ant-list > .ant-spin-nested-loading > .ant-spin-container {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
	}
	.record-list.ant-list[data-paginated="true"] .ant-list-items {
		display: grid;
		flex: 1;
		min-height: 0;
		grid-template-rows: repeat(${({ $pageSize }) => $pageSize ?? 1}, minmax(0, 1fr));
	}
	.record-list.ant-list .ant-list-item {
		min-height: 0;
		align-items: center;
		overflow: hidden;
	}
	.record-list.ant-list .ant-list-item-meta {
		min-width: 0;
		margin-inline-end: 0;
	}
	.record-list.ant-list .ant-list-item-meta-content,
	.record-list.ant-list .ant-list-item-meta-title,
	.record-list.ant-list .ant-list-item-meta-description {
		min-width: 0;
		overflow: hidden;
	}
	.record-list-title {
		display: flex;
		width: 100%;
		min-width: 0;
	}
	.record-list-title .ant-tag {
		flex: none;
	}
	.record-list-title > .ant-space-item:last-child {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}
	.record-list-title .ant-typography {
		display: block;
		max-width: 100%;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.record-list-description {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.record-list.ant-list .ant-list-item-action {
		width: 32px;
		flex: 0 0 32px;
		min-width: 32px;
		margin-inline-start: 2px;
		padding: 0;
	}
	.record-list.ant-list .ant-list-item-action > li {
		width: 32px;
		margin-inline: 0 !important;
		padding-inline: 0 !important;
	}
	.record-list.ant-list .ant-list-pagination {
		flex: none;
		margin-block: 12px 0;
		text-align: center;
	}
	.record-list.ant-list .ant-list-pagination .ant-pagination {
		justify-content: center;
	}
	.record-list.ant-list[data-single-page="true"] .ant-list-pagination {
		visibility: hidden;
		pointer-events: none;
	}
`;
