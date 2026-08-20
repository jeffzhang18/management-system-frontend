import { Card, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { memo, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { WorkRecordContributionItem } from "@/api/services/workRecordService";
import { themeVars } from "@/theme/theme.css";

interface Props {
	items: WorkRecordContributionItem[];
	loading: boolean;
	year: number;
	years: number[];
	onYearChange: (year: number) => void;
	onDateSelect: (date: string) => void;
}

interface ContributionDay {
	key: string;
	count: number;
	level: number;
	inYear: boolean;
}

const CELL_SIZE = 11;
const CELL_GAP = 3;
const clampLevel = (level: number) => Math.min(4, Math.max(0, Math.round(level)));
const intensityColor = (level: number) => {
	if (level === 0) return `color-mix(in srgb, ${themeVars.colors.text.primary} 8%, ${themeVars.colors.background.paper})`;
	const strength = [0, 24, 45, 68, 100][level];
	return `color-mix(in srgb, ${themeVars.colors.palette.primary.default} ${strength}%, ${themeVars.colors.background.paper})`;
};

function ContributionGraphComponent({ items, loading, year, years, onYearChange, onDateSelect }: Props) {
	const { t, i18n } = useTranslation();
	const tooltipRef = useRef<HTMLDivElement>(null);
	const showTooltip = (target: HTMLElement, text: string) => {
		const tooltip = tooltipRef.current;
		if (!tooltip) return;
		const rect = target.getBoundingClientRect();
		tooltip.textContent = text;
		tooltip.style.left = `${rect.left + rect.width / 2}px`;
		tooltip.style.top = `${rect.top - 6}px`;
		tooltip.style.opacity = "1";
	};
	const hideTooltip = () => {
		if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
	};
	const { weeks, monthLabels, weekCount, total } = useMemo(() => {
		const valueByDate = new Map(items.map((item) => [dayjs(item.date).format("YYYY-MM-DD"), item]));
		const yearStart = dayjs(`${year}-01-01`);
		const yearEnd = dayjs(`${year}-12-31`);
		const start = yearStart.startOf("week");
		const end = yearEnd.endOf("week");
		const weekCount = end.diff(start, "week") + 1;
		const result: ContributionDay[][] = [];
		const labels: Array<{ label: string; column: number }> = [];
		let cursor = start;
		let previousMonth = -1;

		for (let column = 0; column < weekCount; column += 1) {
			const week: ContributionDay[] = [];
			for (let row = 0; row < 7; row += 1) {
				const key = cursor.format("YYYY-MM-DD");
				const item = valueByDate.get(key);
				week.push({
					key,
					count: Number(item?.records ?? 0),
					level: clampLevel(Number(item?.level ?? 0)),
					inYear: cursor.year() === year,
				});
				if (cursor.year() === year && cursor.month() !== previousMonth && cursor.date() <= 7) {
					labels.push({ label: cursor.format(i18n.resolvedLanguage === "zh_CN" ? "M月" : "MMM"), column });
					previousMonth = cursor.month();
				}
				cursor = cursor.add(1, "day");
			}
			result.push(week);
		}

		return {
			weeks: result,
			monthLabels: labels,
			weekCount,
			total: items.reduce((sum, item) => sum + Number(item.records ?? 0), 0),
		};
	}, [i18n.resolvedLanguage, items, year]);

	return (
		<ContributionCard>
			<Header>
				<div>
					<Typography.Title level={5}>{t("sys.record.contributions.title")}</Typography.Title>
					<Typography.Text type="secondary">{t("sys.record.contributions.summary", { year, count: total })}</Typography.Text>
				</div>
			</Header>
			<Content>
				<Spin spinning={loading}>
					<ScrollArea>
						<Chart $weekCount={weekCount} aria-label={t("sys.record.contributions.yearLabel", { year })}>
							<Months>
								{monthLabels.map(({ label, column }) => (
									<Month key={`${label}-${column}`} style={{ left: column * (CELL_SIZE + CELL_GAP) }}>{label}</Month>
								))}
							</Months>
							<Weekdays aria-hidden="true">
								<span>{t("sys.record.contributions.monday")}</span>
								<span>{t("sys.record.contributions.wednesday")}</span>
								<span>{t("sys.record.contributions.friday")}</span>
							</Weekdays>
							<Grid>
								{weeks.map((week) => (
									<Week key={week[0].key}>
										{week.map((day) => {
											const tooltip = day.inYear ? t("sys.record.contributions.tooltip", { date: day.key, count: day.count }) : undefined;
											return (
												<Cell
													key={day.key}
													$level={day.level}
													$hidden={!day.inYear}
													$interactive={day.inYear}
													aria-label={tooltip}
													role={day.inYear ? "button" : undefined}
													tabIndex={day.inYear ? 0 : -1}
													onClick={() => {
														if (day.inYear) onDateSelect(day.key);
													}}
													onMouseEnter={(event) => {
														if (tooltip) showTooltip(event.currentTarget, tooltip);
													}}
													onMouseLeave={hideTooltip}
													onFocus={(event) => {
														if (tooltip) showTooltip(event.currentTarget, tooltip);
													}}
													onBlur={hideTooltip}
													onKeyDown={(event) => {
														if (day.inYear && (event.key === "Enter" || event.key === " ")) {
															event.preventDefault();
															onDateSelect(day.key);
														}
													}}
												/>
											);
										})}
									</Week>
								))}
							</Grid>
						</Chart>
						<Legend $weekCount={weekCount}>
							<span>{t("sys.record.contributions.less")}</span>
							{[0, 1, 2, 3, 4].map((level) => <Cell key={level} $level={level} $hidden={false} aria-hidden="true" />)}
							<span>{t("sys.record.contributions.more")}</span>
						</Legend>
					</ScrollArea>
				</Spin>
				<YearList aria-label={t("sys.record.contributions.selectYear")}>
					{years.map((option) => (
						<YearButton key={option} type="button" $active={option === year} onClick={() => onYearChange(option)} aria-pressed={option === year}>
							{option}
						</YearButton>
					))}
				</YearList>
			</Content>
			{createPortal(<ContributionTooltip ref={tooltipRef} aria-hidden="true" />, document.body)}
		</ContributionCard>
	);
}

export const ContributionGraph = memo(ContributionGraphComponent);

const ContributionCard = styled(Card)`
	width: 100%; min-width: 0; overflow: hidden;
	.ant-card-body { padding: 20px 24px; }
	@media (max-width: 767px) { .ant-card-body { padding: 16px 12px; } }
`;
const Header = styled.div`
	margin-bottom: 18px; h5.ant-typography { margin: 0 0 2px; }
	@media (max-width: 767px) { padding: 0 4px; margin-bottom: 14px; }
`;
const Content = styled.div`
	display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr) 86px; align-items: start; gap: 20px;
	> .ant-spin-nested-loading, > .ant-spin-nested-loading > .ant-spin-container { width: 100%; min-width: 0; }
	@media (max-width: 767px) { display: flex; flex-direction: column-reverse; gap: 12px; }
`;
const ScrollArea = styled.div`
	width: 100%; max-width: 100%; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 0 0 4px; overscroll-behavior-inline: contain; scrollbar-width: thin; -webkit-overflow-scrolling: touch;
	@media (max-width: 767px) { padding-right: 4px; padding-bottom: 8px; }
`;
const Chart = styled.div<{ $weekCount: number }>`position: relative; width: ${({ $weekCount }) => $weekCount * (CELL_SIZE + CELL_GAP) - CELL_GAP}px; margin-left: 32px; padding-top: 32px;`;
const Months = styled.div`position: absolute; top: 0; left: 0; width: 100%; height: 18px; color: ${themeVars.colors.text.secondary}; font-size: 11px;`;
const Month = styled.span`position: absolute; white-space: nowrap;`;
const Weekdays = styled.div`
	position: absolute; top: 32px; left: -32px; display: grid; height: ${7 * (CELL_SIZE + CELL_GAP) - CELL_GAP}px; grid-template-rows: repeat(7, ${CELL_SIZE}px); gap: ${CELL_GAP}px; color: ${themeVars.colors.text.secondary}; font-size: 10px;
	span:nth-child(1) { grid-row: 2; } span:nth-child(2) { grid-row: 4; } span:nth-child(3) { grid-row: 6; }
`;
const Grid = styled.div`display: flex; gap: ${CELL_GAP}px;`;
const Week = styled.div`display: flex; flex-direction: column; gap: ${CELL_GAP}px;`;
const Cell = styled.span<{ $level: number; $hidden: boolean; $interactive?: boolean }>`
	position: relative; display: block; width: ${CELL_SIZE}px; height: ${CELL_SIZE}px; flex: none; border: 1px solid color-mix(in srgb, ${themeVars.colors.text.primary} 8%, transparent); border-radius: 2px;
	background: ${({ $level }) => intensityColor($level)};
	visibility: ${({ $hidden }) => ($hidden ? "hidden" : "visible")};
	cursor: ${({ $interactive }) => ($interactive ? "pointer" : "default")};
	&:focus-visible { outline: 2px solid ${themeVars.colors.palette.primary.default}; outline-offset: 2px; }
`;
const ContributionTooltip = styled.div`
	position: fixed;
	z-index: 1100;
	max-width: 220px;
	padding: 5px 8px;
	border-radius: 5px;
	color: #fff;
	font-size: 12px;
	line-height: 16px;
	white-space: nowrap;
	background: rgb(0 0 0 / 82%);
	opacity: 0;
	pointer-events: none;
	transform: translate(-50%, -100%);
	transition: opacity 100ms ease;
`;
const Legend = styled.div<{ $weekCount: number }>`display: flex; width: ${({ $weekCount }) => $weekCount * (CELL_SIZE + CELL_GAP) - CELL_GAP + 32}px; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 12px; color: ${themeVars.colors.text.secondary}; font-size: 11px;`;
const YearList = styled.div`
	display: flex; flex-direction: column; gap: 4px;
	@media (max-width: 767px) { width: 100%; min-width: 0; flex-direction: row; gap: 6px; overflow-x: auto; padding: 0 4px 2px; overscroll-behavior-inline: contain; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
`;
const YearButton = styled.button<{ $active: boolean }>`
	width: 100%; min-height: 36px; padding: 7px 12px; border: 0; border-radius: 6px; color: ${({ $active }) => ($active ? "#fff" : themeVars.colors.text.secondary)}; font: inherit; font-size: 13px; text-align: left; background: ${({ $active }) => ($active ? themeVars.colors.palette.primary.default : "transparent")}; cursor: pointer;
	&:hover { color: ${({ $active }) => ($active ? "#fff" : themeVars.colors.text.primary)}; background: ${({ $active }) => ($active ? themeVars.colors.palette.primary.default : `color-mix(in srgb, ${themeVars.colors.text.primary} 7%, transparent)`)}; }
	@media (max-width: 767px) { width: auto; min-width: 68px; min-height: 40px; flex: none; padding-inline: 14px; text-align: center; }
`;
