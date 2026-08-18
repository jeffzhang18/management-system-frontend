import { Button, Card, Empty, Flex, Space, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { Icon } from "@/components/icon";
import { Markdown } from "./markdown";
import { loadRecords, loadThemes } from "./storage";
import { getRecordTheme, getRecordThemeLabel } from "./types";

export default function RecordDetailPage() {
	const { t } = useTranslation();
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const record = loadRecords().find((item) => item.id === id);
	if (!record)
		return (
			<Card>
				<Empty description={t("sys.record.recordMissing")}>
					<Button onClick={() => navigate("/record")}>{t("sys.record.backCalendar")}</Button>
				</Empty>
			</Card>
		);
	const theme = getRecordTheme(record.theme, loadThemes());
	return (
		<div>
			<Flex align="center" gap={12} style={{ marginBottom: 20 }}>
				<Button
					type="text"
					icon={<Icon icon="solar:arrow-left-linear" size={22} />}
					onClick={() => navigate(location.state?.from === "day" ? `/record/day/${record.date}` : "/record")}
					aria-label={location.state?.from === "day" ? t("sys.record.backDay") : t("sys.record.backCalendar")}
				/>
				<Typography.Title level={3} style={{ margin: 0 }}>
					{t("sys.record.detailTitle")}
				</Typography.Title>
			</Flex>
			<Card>
				<Space direction="vertical" size="large" style={{ width: "100%" }}>
					<Space wrap>
						<Tag color={theme.color}>{getRecordThemeLabel(theme, t)}</Tag>
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
			</Card>
		</div>
	);
}
