import { message, Modal, Spin, Typography } from "antd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Markdown } from "./markdown";

interface Props {
	open: boolean;
	weeklyReport: string;
	nextWeekPlan: string;
	showNextWeekPlan: boolean;
	nextWeekPlanLoading: boolean;
	onClose: () => void;
}

export function AiReportModal({ open, weeklyReport, nextWeekPlan, showNextWeekPlan, nextWeekPlanLoading, onClose }: Props) {
	const { t } = useTranslation();

	const copyReport = async (content: string) => {
		try {
			await navigator.clipboard.writeText(content);
			message.success(t("sys.record.export.copied"));
		} catch {
			message.error(t("sys.record.export.copyFailed"));
		}
	};

	return (
		<Modal
			title={t("sys.record.export.aiSummary")}
			open={open}
			centered
			width={720}
			onCancel={onClose}
			footer={
				<Actions>
					<Button type="button" variant="outline" onClick={onClose}>
						{t("sys.record.export.close")}
					</Button>
				</Actions>
			}
		>
			<Reports>
				<ReportSection>
					<SectionHeader>
						<Typography.Title level={5}>{t("sys.record.export.weeklyReportTitle")}</Typography.Title>
						<Button type="button" size="sm" variant="outline" className="text-sm" onClick={() => void copyReport(weeklyReport)}>
							<Icon icon="solar:copy-bold-duotone" size={16} />
							{t("sys.record.export.copy")}
						</Button>
					</SectionHeader>
					<ReportContent>
						<Markdown>{weeklyReport}</Markdown>
					</ReportContent>
				</ReportSection>

				{showNextWeekPlan && (
					<ReportSection>
						<SectionHeader>
							<Typography.Title level={5}>{t("sys.record.export.nextWeekPlanTitle")}</Typography.Title>
							{nextWeekPlan && !nextWeekPlanLoading && (
								<Button type="button" size="sm" variant="outline" className="text-sm" onClick={() => void copyReport(nextWeekPlan)}>
									<Icon icon="solar:copy-bold-duotone" size={16} />
									{t("sys.record.export.copy")}
								</Button>
							)}
						</SectionHeader>
						<ReportContent>
							{nextWeekPlanLoading ? (
								<LoadingState>
									<Spin size="small" />
									<Typography.Text type="secondary">{t("sys.record.export.generatingNextWeekPlan")}</Typography.Text>
								</LoadingState>
							) : nextWeekPlan ? (
								<Markdown>{nextWeekPlan}</Markdown>
							) : (
								<Typography.Text type="secondary">{t("sys.record.export.aiEmpty")}</Typography.Text>
							)}
						</ReportContent>
					</ReportSection>
				)}
			</Reports>
		</Modal>
	);
}

const Actions = styled.div`display: flex; justify-content: flex-end; gap: 8px;`;
const Reports = styled.div`display: flex; max-height: 65vh; flex-direction: column; gap: 16px; overflow-y: auto;`;
const ReportSection = styled.section`display: flex; flex-direction: column; gap: 8px;`;
const SectionHeader = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 12px; .ant-typography { margin: 0; }`;
const ReportContent = styled.div`min-height: 72px; padding: 16px; overflow: auto; border: 1px solid rgb(0 0 0 / 10%); border-radius: 10px; background: rgb(0 0 0 / 2%);`;
const LoadingState = styled.div`display: flex; min-height: 48px; align-items: center; justify-content: center; gap: 10px;`;
