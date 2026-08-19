import { Button, Calendar, Card, Flex, message, Popover, Space, Spin, Tooltip, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import styled from "styled-components";
import type { CreateWorkRecordReq, WorkRecordContributionItem } from "@/api/services/workRecordService";
import workRecordService from "@/api/services/workRecordService";
import { Icon } from "@/components/icon";
import { useMediaQuery } from "@/hooks/use-media-query";
import { themeVars } from "@/theme/theme.css";
import {
	type CalendarCellRecord,
	mapCalendarSummaryItem,
	mapThemeListToOptions,
	mapWorkRecordDetail,
	parseImportRecordsPayload,
	resolveThemeIdByThemeValue,
} from "./api-adapter";
import { ExportModal } from "./export-modal";
import { ContributionGraph } from "./contribution-graph";
import { exportRecords, type ExportFormat } from "./export-records";
import { type CreateRecordFormPayload, RecordFormModal } from "./record-form-modal";
import { RecordList } from "./record-list";
import { compareWorkRecords, getRecordTheme, getRecordThemeLabel, type RecordThemeOption, type WorkRecord } from "./types";

const dateKey = (date: Dayjs) => date.format("YYYY-MM-DD");

export default function RecordPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const isMobile = useMediaQuery({ maxWidth: 767 });
	const [selectedDate, setSelectedDate] = useState(dayjs());
	const [calendarRecords, setCalendarRecords] = useState<CalendarCellRecord[]>([]);
	const [dayRecords, setDayRecords] = useState<WorkRecord[]>([]);
	const [hoverRecordsByDate, setHoverRecordsByDate] = useState<Record<string, WorkRecord[]>>({});
	const [hoverLoadingDates, setHoverLoadingDates] = useState<Set<string>>(() => new Set());
	const [themes, setThemes] = useState<RecordThemeOption[]>([]);
	const [calendarLoading, setCalendarLoading] = useState(false);
	const [dayLoading, setDayLoading] = useState(false);
	const [exportCount, setExportCount] = useState(0);
	const [contributions, setContributions] = useState<WorkRecordContributionItem[]>([]);
	const [contributionsLoading, setContributionsLoading] = useState(false);
	const [contributionYear, setContributionYear] = useState(dayjs().year());
	const contributionYears = useMemo(() => Array.from({ length: 5 }, (_, index) => dayjs().year() - index), []);

	const [createOpen, setCreateOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const [mobilePopoverDate, setMobilePopoverDate] = useState<string | null>(null);
	const [exportRange, setExportRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs()]);
	const [exportFormat, setExportFormat] = useState<ExportFormat>("txt");

	const selectedDateKey = dateKey(selectedDate);
	const monthStart = selectedDate.startOf("month").format("YYYY-MM-DD");
	const monthEnd = selectedDate.endOf("month").format("YYYY-MM-DD");

	const summaryByDate = useMemo(() => {
		const result = new Map<string, CalendarCellRecord[]>();
		for (const record of calendarRecords) {
			if (!record.date) continue;
			result.set(record.date, [...(result.get(record.date) ?? []), record]);
		}
		return result;
	}, [calendarRecords]);

	const loadHoverRecords = async (date: string) => {
		if (hoverRecordsByDate[date] || hoverLoadingDates.has(date)) return;
		setHoverLoadingDates((previous) => new Set(previous).add(date));
		try {
			const records = await workRecordService.getRecordsByDate(date);
			const normalized = records.map(mapWorkRecordDetail).sort(compareWorkRecords);
			setHoverRecordsByDate((previous) => ({ ...previous, [date]: normalized }));
		} finally {
			setHoverLoadingDates((previous) => {
				const next = new Set(previous);
				next.delete(date);
				return next;
			});
		}
	};

	const loadThemeList = useCallback(async () => {
		const themeList = await workRecordService.getThemes();
		setThemes(mapThemeListToOptions(themeList));
	}, []);

	const loadCalendarSummary = useCallback(async (startDate: string, endDate: string) => {
		setCalendarLoading(true);
		try {
			const records = await workRecordService.getCalendarSummary({ startDate, endDate });
			const mappedSummary = records.map(mapCalendarSummaryItem).filter((item) => item.date);
			setCalendarRecords(mappedSummary);
		} finally {
			setCalendarLoading(false);
		}
	}, []);

	const loadDayRecords = useCallback(async (date: string) => {
		setDayLoading(true);
		try {
			const records = await workRecordService.getRecordsByDate(date);
			const normalized = records.map(mapWorkRecordDetail).sort(compareWorkRecords);
			setDayRecords(normalized);
			setHoverRecordsByDate((previous) => ({ ...previous, [date]: normalized }));
		} finally {
			setDayLoading(false);
		}
	}, []);

	const loadExportCount = useCallback(async (range: [Dayjs, Dayjs]) => {
		const startDate = range[0].format("YYYY-MM-DD");
		const endDate = range[1].format("YYYY-MM-DD");
		try {
			const records = await workRecordService.getCalendarSummary({ startDate, endDate });
			setExportCount(records.length);
		} catch {
			setExportCount(0);
		}
	}, []);

	const loadContributions = useCallback(async () => {
		setContributionsLoading(true);
		try {
			setContributions(await workRecordService.getContributions(contributionYear));
		} finally {
			setContributionsLoading(false);
		}
	}, [contributionYear]);

	useEffect(() => {
		void loadCalendarSummary(monthStart, monthEnd);
	}, [loadCalendarSummary, monthEnd, monthStart]);

	useEffect(() => {
		void loadThemeList();
	}, [loadThemeList]);

	useEffect(() => {
		void loadDayRecords(selectedDateKey);
	}, [loadDayRecords, selectedDateKey]);

	useEffect(() => {
		void loadExportCount(exportRange);
	}, [exportRange, loadExportCount]);

	useEffect(() => {
		void loadContributions();
	}, [loadContributions]);

	const reloadData = useCallback(async () => {
		await Promise.all([
			loadDayRecords(selectedDateKey),
			loadCalendarSummary(monthStart, monthEnd),
			loadThemeList(),
			loadExportCount(exportRange),
			loadContributions(),
		]);
	}, [exportRange, loadCalendarSummary, loadContributions, loadDayRecords, loadExportCount, loadThemeList, monthEnd, monthStart, selectedDateKey]);

	const selectDate = (date: Dayjs) => {
		setSelectedDate(date);
	};

	const openCreateModalForDate = (date: Dayjs) => {
		if (isMobile) setMobilePopoverDate(null);
		setSelectedDate(date);
		setCreateOpen(true);
	};

	const goDayDetail = (date: string) => {
		if (isMobile) setMobilePopoverDate(null);
		navigate(`/record/day/${date}`);
	};

	const handleCreate = async (value: CreateRecordFormPayload) => {
		const selectedTheme = value.theme;
		const resolvedThemeId = resolveThemeIdByThemeValue(selectedTheme);
		const payload: CreateWorkRecordReq = {
			recordDate: value.date,
			title: value.title,
			contentMd: value.description,
			startTime: value.startTime,
			endTime: value.endTime,
		};

		if (resolvedThemeId) payload.themeId = resolvedThemeId;

		await workRecordService.createRecord(payload);

		setCreateOpen(false);
		message.success(t("sys.record.recordSaved"));
		await reloadData();
	};

	const handleDelete = async (id: string) => {
		try {
			await workRecordService.deleteRecord(id);
			message.success(t("sys.record.recordDeleted"));
			await reloadData();
		} catch {
			// handled by interceptor
		}
	};

	const addTheme = async (theme: RecordThemeOption) => {
		const created = await workRecordService.createTheme({
			themeName: theme.label,
			color: theme.color,
		});
		const createdOption = mapThemeListToOptions([created])[0];
		setThemes((previous) => {
			const filtered = previous.filter((item) => item.value !== createdOption.value);
			return [...filtered, createdOption];
		});
		return createdOption;
	};

	const handleImport = async (file: File) => {
		try {
			const raw = JSON.parse((await file.text()).replace(/^\uFEFF/, "")) as unknown;
			const records = parseImportRecordsPayload(raw, themes);
			if (!records.length) throw new Error("empty");

			const result = await workRecordService.importRecords({ records });
			message.success(t("sys.record.importSuccess", { count: result.succeeded }));
			await reloadData();
		} catch {
			message.error(t("sys.record.importFailed"));
		}

		return false;
	};

	const handleExport = async () => {
		if (!exportCount) {
			message.warning(t("sys.record.export.emptyRange"));
			return;
		}

		const startDate = exportRange[0].format("YYYY-MM-DD");
		const endDate = exportRange[1].format("YYYY-MM-DD");
		const pdfWindow = exportFormat === "pdf" ? window.open("", "_blank") : null;
		if (exportFormat === "pdf" && !pdfWindow) {
			message.error(t("sys.record.export.popupBlocked"));
			return;
		}

		try {
			const summaries = await workRecordService.getCalendarSummary({ startDate, endDate });
			const dates = [
				...new Set(
					summaries
						.map(mapCalendarSummaryItem)
						.map((item) => item.date)
						.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
				),
			];
			const details = await Promise.all(dates.map((date) => workRecordService.getRecordsByDate(date)));
			const records = details.flat().map(mapWorkRecordDetail).sort((a, b) => a.date.localeCompare(b.date) || compareWorkRecords(a, b));
			const range = `${startDate}_${endDate}`;
			const exported = exportRecords(records, themes, range, exportFormat, pdfWindow);
			if (!exported) throw new Error(t("sys.record.export.popupBlocked"));

			message.success(
				exportFormat === "pdf"
					? t("sys.record.export.pdfOpened")
					: t("sys.record.export.exported", { count: records.length }),
			);

			setExportOpen(false);
		} catch (error) {
			pdfWindow?.close();
			const errorMessage = error instanceof Error ? error.message : t("sys.api.errorMessage");
			message.error(errorMessage);
		}
	};

	return (
		<Page>
			<Flex justify="space-between" align="center" gap={16} wrap>
				<div>
					<Typography.Title level={3} style={{ margin: 0 }}>
						{t("sys.record.title")}
					</Typography.Title>
					<Typography.Text type="secondary">{t("sys.record.subtitle")}</Typography.Text>
				</div>
				<Space wrap>
					<Button icon={<Icon icon="solar:download-bold-duotone" size={18} />} onClick={() => setExportOpen(true)}>
						{t("sys.record.exportRecords")}
					</Button>
				</Space>
			</Flex>

			<Workspace>
				<CalendarCard styles={{ body: { padding: isMobile ? 8 : 16 } }} loading={calendarLoading}>
					<Calendar
						value={selectedDate}
						onSelect={(date) => selectDate(date)}
						headerRender={({ value, onChange }) => (
							<CalendarHeader>
								<Space size={2}>
									<Tooltip title={t("sys.record.previousYear")}>
										<Button
											type="text"
											icon={<Icon icon="solar:double-alt-arrow-left-linear" size={20} />}
											onClick={() => {
												const previous = value.subtract(1, "year");
												onChange(previous);
												setSelectedDate(previous);
											}}
											aria-label={t("sys.record.previousYear")}
										/>
									</Tooltip>
									<Tooltip title={t("sys.record.previousMonth")}>
										<Button
											type="text"
											icon={<Icon icon="solar:alt-arrow-left-linear" size={20} />}
											onClick={() => {
												const previous = value.subtract(1, "month");
												onChange(previous);
												setSelectedDate(previous);
											}}
											aria-label={t("sys.record.previousMonth")}
										/>
									</Tooltip>
								</Space>
								<Typography.Title level={4} style={{ margin: 0 }}>
									{i18n.resolvedLanguage === "zh_CN" ? value.format("YYYY年 M月") : value.format("MMMM YYYY")}
								</Typography.Title>
								<Space size={2}>
									<Button
										onClick={() => {
											const today = dayjs();
											onChange(today);
											setSelectedDate(today);
										}}
									>
										{t("sys.record.today")}
									</Button>
									<Tooltip title={t("sys.record.nextMonth")}>
										<Button
											type="text"
											icon={<Icon icon="solar:alt-arrow-right-linear" size={20} />}
											onClick={() => {
												const next = value.add(1, "month");
												onChange(next);
												setSelectedDate(next);
											}}
											aria-label={t("sys.record.nextMonth")}
										/>
									</Tooltip>
									<Tooltip title={t("sys.record.nextYear")}>
										<Button
											type="text"
											icon={<Icon icon="solar:double-alt-arrow-right-linear" size={20} />}
											onClick={() => {
												const next = value.add(1, "year");
												onChange(next);
												setSelectedDate(next);
											}}
											aria-label={t("sys.record.nextYear")}
										/>
									</Tooltip>
								</Space>
							</CalendarHeader>
						)}
						fullCellRender={(date, info) => {
							if (info.type !== "date") return info.originNode;

							const key = dateKey(date);
							const dotItems = summaryByDate.get(key) ?? [];
							const hoverRecords = hoverRecordsByDate[key];
							const openCreateModal = () => {
								openCreateModalForDate(date);
							};
							const hoverContent = (
								<HoverContent>
									<HoverRecordList $rows={dotItems.length}>
										{(!hoverRecords || hoverLoadingDates.has(key)) && (
											<HoverLoading><Spin size="small" /></HoverLoading>
										)}
										{(hoverRecords ?? []).map((record) => {
											const theme = getRecordTheme(record.theme, themes);
											return (
												<HoverRecord key={record.id}>
													<HoverTheme $color={record.themeColor ?? theme.color}>
														{record.themeName ?? getRecordThemeLabel(theme, (translationKey) => t(translationKey))}
													</HoverTheme>
													<HoverTitle>{record.title}</HoverTitle>
												</HoverRecord>
											);
										})}
									</HoverRecordList>
									{isMobile && (
										<HoverActions>
											<Button type="primary" block size="small" onClick={openCreateModal}>
												{t("sys.record.new")}
											</Button>
											<Button block size="small" onClick={() => goDayDetail(key)}>
												{t("sys.record.dayDetail")}
											</Button>
										</HoverActions>
									)}
								</HoverContent>
							);

							const cell = (
								<DateCell
									$selected={date.isSame(selectedDate, "day")}
									$today={date.isSame(dayjs(), "day")}
									$outside={!date.isSame(selectedDate, "month")}
								>
									<DateNumber>{date.date()}</DateNumber>
									{!isMobile && (
									<QuickAdd
										type="text"
										size="small"
										icon={<Icon icon="solar:add-circle-linear" size={17} />}
										onClick={(event) => {
											event.stopPropagation();
											openCreateModal();
										}}
										aria-label={t("sys.record.addOnDate", { date: key })}
									/>
								)}
									<CellRecords aria-label={t("sys.record.viewDate", { date: key })}>
										{dotItems.slice(0, 4).map((record) => (
											<i key={record.id} aria-hidden="true" style={{ background: record.color }} />
										))}
										{dotItems.length > 4 && <span aria-hidden="true">…</span>}
									</CellRecords>
								</DateCell>
							);

							return dotItems.length ? (
								<Popover
									key={key}
									content={hoverContent}
									title={`${key} · ${t("sys.record.dayRecordCount", { count: dotItems.length })}`}
									trigger={isMobile ? "click" : "hover"}
									open={isMobile ? mobilePopoverDate === key : undefined}
									placement="top"
									mouseEnterDelay={0.25}
									destroyTooltipOnHide
									onOpenChange={(open) => {
										if (open) void loadHoverRecords(key);
										if (isMobile) setMobilePopoverDate(open ? key : null);
									}}
								>
									{cell}
								</Popover>
							) : cell;
						}}
					/>
				</CalendarCard>

				{!isMobile && (
					<Card
						loading={dayLoading}
						title={
							<DayCardTitle>
								<span>
									{i18n.resolvedLanguage === "zh_CN"
										? selectedDate.format("M月D日 · dddd")
										: selectedDate.format("MMMM D · dddd")}
								</span>
								<Button type="link" size="small" onClick={() => navigate(`/record/day/${dateKey(selectedDate)}`)}>
									{t("sys.record.viewAllToday")}
								</Button>
							</DayCardTitle>
						}
						extra={
							<Button
								type="primary"
								icon={<Icon icon="solar:add-circle-bold" size={18} />}
								onClick={() => setCreateOpen(true)}
							>
								{t("sys.record.new")}
							</Button>
						}
					>
						<RecordList
							records={dayRecords}
							themes={themes}
							onSelect={(record) => navigate(`/record/detail/${record.id}`, { state: { from: "calendar" } })}
							onDelete={(id) => {
								void handleDelete(id);
							}}
						/>
					</Card>
				)}
			</Workspace>

			<ContributionGraph
				items={contributions}
				loading={contributionsLoading}
				year={contributionYear}
				years={contributionYears}
				onYearChange={setContributionYear}
			/>

			<RecordFormModal
				open={createOpen}
				date={selectedDate}
				themes={themes}
				onCancel={() => setCreateOpen(false)}
				onAddTheme={addTheme}
				onImport={handleImport}
				onCreate={handleCreate}
			/>

			<ExportModal
				open={exportOpen}
				range={exportRange}
				format={exportFormat}
				count={exportCount}
				onRangeChange={setExportRange}
				onFormatChange={setExportFormat}
				onCancel={() => setExportOpen(false)}
				onExport={() => {
					void handleExport();
				}}
			/>
		</Page>
	);
}

const Page = styled.div`display: flex; flex-direction: column; gap: 24px;`;
const Workspace = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; @media (max-width: 767px) { grid-template-columns: minmax(0, 1fr); }`;
const CalendarHeader = styled.div`display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; column-gap: 6px; padding: 4px 0 16px; > :last-child { justify-self: end; }`;
const DayCardTitle = styled.div`display: flex; flex-direction: column; align-items: flex-start; line-height: 1.3; .ant-btn { height: auto; padding: 2px 0 0; font-weight: 400; }`;
const CalendarCard = styled(Card)`
	.ant-picker-calendar-date { height: auto !important; margin: 3px !important; padding: 0 !important; border: 0 !important; }
	.ant-picker-calendar-date-content { height: auto !important; overflow: hidden !important; }
	.ant-picker-cell::before { display: none !important; }
	@media (max-width: 767px) { .ant-picker-calendar-date { margin: 2px !important; } }
`;
const DateCell = styled.div<{ $selected: boolean; $today: boolean; $outside: boolean }>`
	position: relative;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	width: 100%;
	aspect-ratio: 1;
	padding: 10px;
	overflow: hidden;
	border: 1px solid ${({ $selected }) => ($selected ? themeVars.colors.palette.primary.default : "transparent")};
	border-radius: 12px;
	background: ${({ $selected }) =>
		$selected ? `color-mix(in srgb, ${themeVars.colors.palette.primary.default} 16%, transparent)` : "transparent"};
	opacity: ${({ $outside }) => ($outside ? 0.4 : 1)};
	transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
	&:hover {
		border-color: color-mix(in srgb, ${themeVars.colors.palette.primary.default} 24%, transparent);
		background: color-mix(in srgb, ${themeVars.colors.palette.primary.default} 9%, transparent);
		box-shadow: 0 4px 14px rgb(0 0 0 / 5%);
	}
	&:hover button { opacity: 1; }
	${({ $today, $selected }) =>
		$today && !$selected ? `> span:first-child { color: white; background: ${themeVars.colors.palette.primary.default}; }` : ""}
	@media (max-width: 767px) { padding: 5px; border-radius: 8px; }
`;
const DateNumber = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	flex: none;
	border-radius: 50%;
	font-weight: 600;
	@media (max-width: 767px) { width: 22px; height: 22px; font-size: 12px; }
`;
const QuickAdd = styled(
	Button,
)`&& { position: absolute; top: 6px; right: 5px; opacity: 0; transition: opacity 160ms ease; } @media (max-width: 767px) { display: none; }`;
const HoverContent = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`;
const HoverRecordList = styled.div<{ $rows: number }>`
	position: relative;
	display: flex;
	width: 260px;
	height: ${({ $rows }) => `${Math.min(Math.max($rows, 1), 8) * 32 - 8}px`};
	flex-direction: column;
	gap: 8px;
	overflow-y: auto;
	@media (max-width: 767px) { width: min(260px, calc(100vw - 56px)); }
`;
const HoverActions = styled.div`
	display: flex;
	gap: 8px;
	.ant-btn { flex: 1; }
`;
const HoverLoading = styled.div`
	position: absolute;
	inset: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	background: ${themeVars.colors.background.paper};
`;
const HoverRecord = styled.div`display: grid; min-height: 24px; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 8px;`;
const HoverTheme = styled.span<{ $color: string }>`
	max-width: 90px;
	padding: 2px 7px;
	overflow: hidden;
	border-radius: 999px;
	color: ${({ $color }) => $color};
	font-size: 11px;
	font-weight: 600;
	line-height: 18px;
	text-overflow: ellipsis;
	white-space: nowrap;
	background: ${({ $color }) => `color-mix(in srgb, ${$color} 12%, white)`};
`;
const HoverTitle = styled.span`overflow: hidden; color: ${themeVars.colors.text.primary}; font-size: 13px; line-height: 20px; text-overflow: ellipsis; white-space: nowrap;`;
const CellRecords = styled.div`
	position: absolute;
	right: 10px;
	bottom: 7px;
	left: 10px;
	display: flex;
	height: 16px;
	align-items: center;
	justify-content: flex-start;
	gap: 4px;
	overflow: hidden;
	color: ${themeVars.colors.text.secondary};
	font-size: 12px;
	line-height: 16px;
	pointer-events: auto;
	i { display: block; width: 7px; height: 7px; flex: none; border-radius: 50%; }
	span { height: 12px; flex: none; color: ${themeVars.colors.text.secondary}; font-size: 14px; line-height: 8px; }
	@media (max-width: 767px) {
		right: 2px;
		bottom: 4px;
		left: 2px;
		height: 8px;
		gap: 3px;
		line-height: 8px;
		i { width: 5px; height: 5px; }
		span { height: 9px; font-size: 12px; line-height: 6px; }
	}
`;
