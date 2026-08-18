import { Button, Card, Empty, Flex, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import workRecordService from "@/api/services/workRecordService";
import { Icon } from "@/components/icon";
import { mapWorkRecordDetail } from "./api-adapter";
import { Markdown } from "./markdown";
import type { WorkRecord } from "./types";

export default function RecordDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();

	const [record, setRecord] = useState<WorkRecord | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) {
			setLoading(false);
			setRecord(null);
			return;
		}

		let active = true;
		setLoading(true);

		void workRecordService
			.getRecordDetail(id)
			.then((data) => {
				if (!active) return;
				setRecord(mapWorkRecordDetail(data));
			})
			.catch(() => {
				if (!active) return;
				setRecord(null);
			})
			.finally(() => {
				if (!active) return;
				setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [id]);

	if (!loading && !record)
		return (
			<Card>
				<Empty description={t("sys.record.recordMissing")}>
					<Button onClick={() => navigate("/record")}>{t("sys.record.backCalendar")}</Button>
				</Empty>
			</Card>
		);

	const backTarget = record && location.state?.from === "day" ? `/record/day/${record.date}` : "/record";

	return (
		<div>
			<Flex align="center" gap={12} style={{ marginBottom: 20 }}>
				<Button
					type="text"
					icon={<Icon icon="solar:arrow-left-linear" size={22} />}
					onClick={() => navigate(backTarget)}
					aria-label={location.state?.from === "day" ? t("sys.record.backDay") : t("sys.record.backCalendar")}
				/>
				<Typography.Title level={3} style={{ margin: 0 }}>
					{t("sys.record.detailTitle")}
				</Typography.Title>
			</Flex>
			<Card loading={loading}>
				{record && (
					<Space direction="vertical" size="large" style={{ width: "100%" }}>
						<Space wrap>
							<Tag color={record.themeColor ?? "#64748b"}>{record.themeName ?? t("sys.record.themes.other")}</Tag>
							<Typography.Text type="secondary">
								{record.date} · {record.startTime ?? t("sys.record.allDay")}
								{record.endTime ? ` - ${record.endTime}` : ""}
							</Typography.Text>
						</Space>
						<Typography.Title level={2} style={{ margin: 0 }}>
							{record.title}
						</Typography.Title>
						{record.description ? (
							<Markdown>{record.description}</Markdown>
						) : (
							<Typography.Text type="secondary">{t("sys.record.noDetails")}</Typography.Text>
						)}
					</Space>
				)}
			</Card>
		</div>
	);
}

