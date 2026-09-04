import { Card, Empty, Flex, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import workRecordService from "@/api/services/workRecordService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { mapWorkRecordDetail } from "./api-adapter";
import { Markdown } from "./markdown";
import type { WorkRecord } from "./types";

type RecordDetailLocationState = {
	from?: "calendar" | "day";
	focusDate?: string;
};

const resolveFocusDateFromState = (state: unknown): string | null => {
	if (!state || typeof state !== "object") return null;
	const focusDate = (state as { focusDate?: unknown }).focusDate;
	return typeof focusDate === "string" ? focusDate : null;
};

export default function RecordDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const locationState = location.state as RecordDetailLocationState | null;
	const focusDate = resolveFocusDateFromState(location.state);

	const [record, setRecord] = useState<WorkRecord | null>(null);
	const [loading, setLoading] = useState(true);

	const goBack = () => {
		if (record && locationState?.from === "day") {
			navigate(`/record/day/${record.date}`, { state: { focusDate: record.date } });
			return;
		}
		navigate("/record", { state: { focusDate: focusDate ?? record?.date ?? dayjs().format("YYYY-MM-DD") } });
	};

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
					<Button onClick={goBack}>{t("sys.record.backCalendar")}</Button>
				</Empty>
			</Card>
		);

	return (
		<div>
			<Flex align="center" gap={12} style={{ marginBottom: 20 }}>
				<Button
					variant="ghost"
					size="icon"
					onClick={goBack}
					aria-label={locationState?.from === "day" ? t("sys.record.backDay") : t("sys.record.backCalendar")}
				>
					<Icon icon="solar:arrow-left-linear" size={22} />
				</Button>
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
