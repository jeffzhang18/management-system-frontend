import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import analysisService, { type AnalysisPeriodQuery } from "@/api/services/analysisService";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import { Button } from "@/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";

// ---------------------- 数据区 ----------------------
const timeOptions = [
	{ label: "Day", value: "day" },
	{ label: "Week", value: "week" },
	{ label: "Month", value: "month" },
];

type TimeType = "day" | "week" | "month";

type AnalysisBucket = {
	label: string;
	query: AnalysisPeriodQuery;
};

type WebAnalyticData = {
	pageViews: number;
	pageViewsChange: number;
	avgTime: string;
	avgTimeChange: number;
	chart: {
		series: { name: string; data: number[] }[];
		categories: string[];
	};
};

const parseDateKey = (dateKey: string) => {
	const [year, month, day] = dateKey.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day));
};

const toDateKey = (date: Date) =>
	`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const addDays = (dateKey: string, amount: number) => {
	const date = parseDateKey(dateKey);
	date.setUTCDate(date.getUTCDate() + amount);
	return toDateKey(date);
};

const addMonths = (dateKey: string, amount: number) => {
	const date = parseDateKey(dateKey);
	date.setUTCMonth(date.getUTCMonth() + amount, 1);
	return toDateKey(date);
};

const getChinaToday = () => {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Shanghai",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	return `${values.year}-${values.month}-${values.day}`;
};

const formatDateLabel = (dateKey: string, includeYear = false) =>
	new Intl.DateTimeFormat("en-US", {
		timeZone: "UTC",
		month: "short",
		day: includeYear ? undefined : "numeric",
		year: includeYear ? "2-digit" : undefined,
	}).format(parseDateKey(dateKey));

const buildAnalysisBuckets = (timeType: TimeType): AnalysisBucket[] => {
	const today = getChinaToday();

	if (timeType === "day") {
		return Array.from({ length: 12 }, (_, index) => {
			const date = addDays(today, index - 11);
			return { label: formatDateLabel(date), query: { date } };
		});
	}

	if (timeType === "week") {
		return Array.from({ length: 12 }, (_, index) => {
			const endDate = addDays(today, (index - 11) * 7);
			const startDate = addDays(endDate, -6);
			return { label: formatDateLabel(endDate), query: { startDate, endDate } };
		});
	}

	const currentMonthStart = `${today.slice(0, 7)}-01`;
	return Array.from({ length: 12 }, (_, index) => {
		const startDate = addMonths(currentMonthStart, index - 11);
		const endDate = addDays(addMonths(startDate, 1), -1);
		return { label: formatDateLabel(startDate, true), query: { startDate, endDate } };
	});
};

const getQueryDateRange = (query: AnalysisPeriodQuery): { startDate: string; endDate: string } => {
	if (query.date) return { startDate: query.date, endDate: query.date };
	if (query.startDate && query.endDate) return { startDate: query.startDate, endDate: query.endDate };
	throw new Error("Analytics date range is unavailable");
};

const getPreviousPeriodQuery = (startDate: string, endDate: string): AnalysisPeriodQuery => {
	const periodLength =
		Math.round((parseDateKey(endDate).getTime() - parseDateKey(startDate).getTime()) / 86_400_000) + 1;
	const previousEndDate = addDays(startDate, -1);
	return {
		startDate: addDays(previousEndDate, -(periodLength - 1)),
		endDate: previousEndDate,
	};
};

const getPercentChange = (current: number, previous: number) => {
	if (previous === 0) return current === 0 ? 0 : 100;
	return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getYAxisRange = (values: number[]) => {
	if (values.length === 0 || values.every((value) => value === 0)) {
		return { min: 0, max: 1 };
	}

	const minimum = Math.min(...values);
	const maximum = Math.max(...values);
	const padding = Math.max((maximum - minimum) * 0.15, maximum * 0.08, 1);

	return {
		min: Math.max(0, Math.floor(minimum - padding)),
		max: Math.ceil(maximum + padding),
	};
};

const formatDuration = (milliseconds: number) => {
	const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
	if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
	return `${seconds}s`;
};

const getWebAnalyticData = async (timeType: TimeType): Promise<WebAnalyticData> => {
	const buckets = buildAnalysisBuckets(timeType);
	const firstBucket = buckets.at(0);
	const currentBucket = buckets.at(-1);

	if (!firstBucket || !currentBucket) throw new Error("Analytics periods are unavailable");

	const firstRange = getQueryDateRange(firstBucket.query);
	const currentRange = getQueryDateRange(currentBucket.query);
	const displayedPeriodQuery: AnalysisPeriodQuery = {
		startDate: firstRange.startDate,
		endDate: currentRange.endDate,
	};
	const previousPeriodQuery = getPreviousPeriodQuery(firstRange.startDate, currentRange.endDate);

	const [pageViewResults, previousPageViews, currentAverage, previousAverage] = await Promise.all([
		Promise.all(buckets.map((bucket) => analysisService.getTotalPageViews(bucket.query, true))),
		analysisService.getTotalPageViews(previousPeriodQuery, true),
		analysisService.getAverageTimeOnPage(displayedPeriodQuery, true),
		analysisService.getAverageTimeOnPage(previousPeriodQuery, true),
	]);

	const pageViews = pageViewResults.reduce((total, result) => total + (result.totalPageViews || 0), 0);

	return {
		pageViews,
		pageViewsChange: getPercentChange(pageViews, previousPageViews.totalPageViews || 0),
		avgTime: formatDuration(currentAverage.averageTimeOnPageMs || 0),
		avgTimeChange: getPercentChange(currentAverage.averageTimeOnPageMs || 0, previousAverage.averageTimeOnPageMs || 0),
		chart: {
			series: [{ name: "Page views", data: pageViewResults.map((result) => result.totalPageViews || 0) }],
			categories: buckets.map((bucket) => bucket.label),
		},
	};
};

// 所有数据都按 day/week/month 维度组织
const dashboardData = {
	visitor: {
		day: { value: 149328, change: 5.2, tip: "vs last day" },
		week: { value: 749853, change: 8.4, tip: "vs last week" },
		month: { value: 1749853, change: 12.4, tip: "vs last year" },
	},
	conversionRate: {
		day: { value: 6.8, change: -1.8, tip: "vs last day" },
		week: { value: 7.0, change: 0.2, tip: "vs last week" },
		month: { value: 7.2, change: 0.8, tip: "vs last year" },
	},
	adCampaign: {
		day: { value: 17333, change: 2.3, tip: "vs last day" },
		week: { value: 114987, change: 6.1, tip: "vs last week" },
		month: { value: 214987, change: 15.6, tip: "vs last year" },
	},
	topPages: {
		day: [
			{ url: "/dashboard", views: 6485, viewsChange: 1.7, unique: 1078, uniqueChange: 1.2 },
			{ url: "/affiliate", views: 3687, viewsChange: 1.4, unique: 801, uniqueChange: 0.9 },
			{ url: "/contract", views: 2918, viewsChange: 2.6, unique: 655, uniqueChange: 1.4 },
			{ url: "/products", views: 4882, viewsChange: -0.7, unique: 936, uniqueChange: -0.3 },
			{ url: "/sign-in", views: 1527, viewsChange: 1.1, unique: 389, uniqueChange: 0.8 },
			{ url: "/about", views: 2103, viewsChange: -0.3, unique: 450, uniqueChange: -1.5 },
		],
		week: [
			{ url: "/dashboard", views: 36485, viewsChange: 2.7, unique: 11078, uniqueChange: 2.2 },
			{ url: "/affiliate", views: 23687, viewsChange: 1.9, unique: 9801, uniqueChange: 1.5 },
			{ url: "/contract", views: 12918, viewsChange: 3.1, unique: 7655, uniqueChange: 2.1 },
			{ url: "/products", views: 14882, viewsChange: -0.2, unique: 9936, uniqueChange: 0.1 },
			{ url: "/sign-in", views: 11527, viewsChange: 1.5, unique: 4389, uniqueChange: 1.2 },
			{ url: "/about", views: 12103, viewsChange: 0.3, unique: 5450, uniqueChange: -0.5 },
		],
		month: [
			{ url: "/dashboard", views: 76485, viewsChange: 4.7, unique: 21078, uniqueChange: 3.2 },
			{ url: "/affiliate", views: 43687, viewsChange: 2.4, unique: 18001, uniqueChange: 1.9 },
			{ url: "/contract", views: 22918, viewsChange: 4.6, unique: 16555, uniqueChange: 2.4 },
			{ url: "/products", views: 24882, viewsChange: 0.7, unique: 19360, uniqueChange: 0.3 },
			{ url: "/sign-in", views: 21527, viewsChange: 2.1, unique: 8389, uniqueChange: 1.8 },
			{ url: "/about", views: 22103, viewsChange: 0.8, unique: 9450, uniqueChange: -1.2 },
		],
	},
	sessionDevices: {
		day: [
			{ label: "Desktop", value: 42.1, color: "#3b82f6", icon: "mdi:desktop-mac" },
			{ label: "Mobile", value: 33.7, color: "#f59e42", icon: "mdi:cellphone" },
			{ label: "Tablet", value: 19.6, color: "#6366f1", icon: "mdi:tablet" },
		],
		week: [
			{ label: "Desktop", value: 42.1, color: "#3b82f6", icon: "mdi:desktop-mac" },
			{ label: "Mobile", value: 33.7, color: "#f59e42", icon: "mdi:cellphone" },
			{ label: "Tablet", value: 19.6, color: "#6366f1", icon: "mdi:tablet" },
		],
		month: [
			{ label: "Desktop", value: 42.1, color: "#3b82f6", icon: "mdi:desktop-mac" },
			{ label: "Mobile", value: 33.7, color: "#f59e42", icon: "mdi:cellphone" },
			{ label: "Tablet", value: 19.6, color: "#6366f1", icon: "mdi:tablet" },
		],
	},
	topChannels: {
		day: [
			{ name: "Google", percent: 40, total: 31731, icon: "logos:google-icon" },
			{ name: "Instagram", percent: 30, total: 23798, icon: "skill-icons:instagram" },
			{ name: "Facebook", percent: 15, total: 11889, icon: "logos:facebook" },
			{ name: "X", percent: 13, total: 10318, icon: "ri:twitter-x-fill" },
		],
		week: [
			{ name: "Google", percent: 38, total: 61731, icon: "logos:google-icon" },
			{ name: "Instagram", percent: 32, total: 43798, icon: "skill-icons:instagram" },
			{ name: "Facebook", percent: 17, total: 21889, icon: "logos:facebook" },
			{ name: "X", percent: 11, total: 20318, icon: "ri:twitter-x-fill" },
		],
		month: [
			{ name: "Google", percent: 41, total: 131731, icon: "logos:google-icon" },
			{ name: "Instagram", percent: 29, total: 123798, icon: "skill-icons:instagram" },
			{ name: "Facebook", percent: 16, total: 61189, icon: "logos:facebook" },
			{ name: "X", percent: 12, total: 40318, icon: "ri:twitter-x-fill" },
		],
	},
	trafficData: {
		day: [
			{ source: "Direct", visits: 1500, unique: 1200, bounce: 40, duration: "00:03:45", progress: 60 },
			{ source: "Natural", visits: 3000, unique: 2500, bounce: 35, duration: "00:04:20", progress: 75 },
			{ source: "Referral", visits: 1000, unique: 850, bounce: 45, duration: "00:03:10", progress: 80 },
			{ source: "Social Media", visits: 2000, unique: 1800, bounce: 50, duration: "00:02:50", progress: 40 },
			{ source: "Email Campaign", visits: 800, unique: 700, bounce: 30, duration: "00:05:00", progress: 55 },
		],
		week: [
			{ source: "Direct", visits: 11500, unique: 11200, bounce: 38, duration: "00:03:35", progress: 62 },
			{ source: "Natural", visits: 23000, unique: 22500, bounce: 33, duration: "00:04:10", progress: 78 },
			{ source: "Referral", visits: 11000, unique: 9850, bounce: 43, duration: "00:03:00", progress: 82 },
			{ source: "Social Media", visits: 12000, unique: 11800, bounce: 48, duration: "00:02:40", progress: 45 },
			{ source: "Email Campaign", visits: 3800, unique: 3700, bounce: 28, duration: "00:05:10", progress: 59 },
		],
		month: [
			{ source: "Direct", visits: 31500, unique: 31200, bounce: 36, duration: "00:03:25", progress: 65 },
			{ source: "Natural", visits: 53000, unique: 52500, bounce: 31, duration: "00:04:00", progress: 80 },
			{ source: "Referral", visits: 21000, unique: 19850, bounce: 41, duration: "00:02:50", progress: 85 },
			{ source: "Social Media", visits: 22000, unique: 21800, bounce: 46, duration: "00:02:30", progress: 50 },
			{ source: "Email Campaign", visits: 7800, unique: 7700, bounce: 26, duration: "00:05:20", progress: 63 },
		],
	},
};

// ---------------------- 组件区 ----------------------
function Trend({ value }: { value: number }) {
	const trendClass = value > 0 ? "text-success" : value < 0 ? "text-error" : "text-muted-foreground";
	return (
		<span className={cn(trendClass, "flex items-center gap-1 font-bold")}>
			{value > 0 ? (
				<Icon icon="mdi:arrow-up" className="inline-block align-middle" size={16} />
			) : value < 0 ? (
				<Icon icon="mdi:arrow-down" className="inline-block align-middle" size={16} />
			) : null}
			{Math.abs(value)}%
		</span>
	);
}

export default function Analysis() {
	const [timeType, setTimeType] = useState<TimeType>("day");
	const {
		data: webAnalytic,
		isLoading: webAnalyticLoading,
		isFetching: webAnalyticFetching,
		isError: webAnalyticError,
		refetch: refetchWebAnalytic,
	} = useQuery({
		queryKey: ["analysis", "web-analytic", timeType],
		queryFn: () => getWebAnalyticData(timeType),
		staleTime: 60_000,
		retry: 1,
	});
	const visitor = dashboardData.visitor[timeType];
	const conversionRate = dashboardData.conversionRate[timeType];
	const adCampaign = dashboardData.adCampaign[timeType];
	const topPages = dashboardData.topPages[timeType];
	const sessionDevices = dashboardData.sessionDevices[timeType];
	const topChannels = dashboardData.topChannels[timeType];
	const trafficData = dashboardData.trafficData[timeType];
	const chartValues = webAnalytic?.chart.series[0]?.data ?? [];
	const yAxisRange = getYAxisRange(chartValues);

	const chartOptions = useChart({
		xaxis: { categories: webAnalytic?.chart.categories ?? [] },
		yaxis: {
			min: yAxisRange.min,
			max: yAxisRange.max,
			forceNiceScale: true,
			labels: {
				formatter: (value) => Math.round(value).toLocaleString(),
			},
		},
		tooltip: {
			y: {
				formatter: (value) => `${Math.round(value).toLocaleString()} views`,
			},
		},
	});

	const deviceChartOptions = useChart({
		labels: sessionDevices.map((d) => d.label),
		stroke: {
			show: false,
		},
		legend: {
			show: false,
		},
		tooltip: {
			fillSeriesColor: false,
		},
		plotOptions: {
			pie: {
				donut: {
					size: "60%",
				},
			},
		},
	});

	return (
		<div className="flex flex-col gap-4">
			{/* summary 区块 */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-none shadow-none">
				<div>
					<Title as="h4" className="text-xl mb-1">
						Analysis overview
					</Title>
					<Text variant="body2" className="text-muted-foreground">
						Explore the metrics to understand trends and drive.
					</Text>
				</div>
				<div className="flex items-center gap-2">
					<Text variant="body2" className="text-muted-foreground">
						Show by:
					</Text>
					<Select value={timeType} onValueChange={(v) => setTimeType(v as any)}>
						<SelectTrigger className="w-32 h-9">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{timeOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex flex-col xl:grid grid-cols-4 gap-4">
				{/* Web analytic 主图表卡片 */}
				<Card className="col-span-4 min-w-0 xl:col-span-3">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Web analytic
							</Title>
						</CardTitle>
						{webAnalyticFetching && !webAnalyticLoading ? (
							<CardAction>
								<Icon icon="mdi:loading" className="animate-spin text-muted-foreground" size={18} />
							</CardAction>
						) : null}
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<div className="flex flex-wrap gap-6 items-center">
							<div>
								<Text variant="subTitle2" className="text-muted-foreground">
									Page views
								</Text>
								{webAnalyticLoading ? (
									<Skeleton className="mt-1 h-8 w-32" />
								) : (
									<div className="flex items-end gap-2">
										<Title as="h3" className="text-2xl">
											{(webAnalytic?.pageViews ?? 0).toLocaleString()}
										</Title>
										{webAnalytic ? <Trend value={webAnalytic.pageViewsChange} /> : null}
									</div>
								)}
							</div>
							<div>
								<Text variant="subTitle2" className="text-muted-foreground">
									Avg. Time on page
								</Text>
								{webAnalyticLoading ? (
									<Skeleton className="mt-1 h-8 w-32" />
								) : (
									<div className="flex items-end gap-2">
										<Title as="h3" className="text-2xl">
											{webAnalytic?.avgTime ?? "0s"}
										</Title>
										{webAnalytic ? <Trend value={webAnalytic.avgTimeChange} /> : null}
									</div>
								)}
							</div>
						</div>
						<div className="w-full min-w-0 min-h-[320px] mt-2">
							{webAnalyticLoading ? <Skeleton className="h-[300px] w-full" /> : null}
							{webAnalyticError ? (
								<div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
									<Icon icon="mdi:chart-line-variant" size={36} className="text-muted-foreground" />
									<Text variant="body2" className="text-muted-foreground">
										Unable to load analytics data.
									</Text>
									<Button size="sm" variant="outline" onClick={() => refetchWebAnalytic()}>
										Try again
									</Button>
								</div>
							) : null}
							{webAnalytic ? (
								<Chart type="line" height={320} options={chartOptions} series={webAnalytic.chart.series} />
							) : null}
						</div>
					</CardContent>
				</Card>

				{/* 右侧三小卡 */}
				<div className="xl:col-span-1 h-full">
					<div className="flex flex-col xl:flex-col md:flex-row gap-4 h-full">
						<Card className="flex-1">
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle>
									<Text variant="subTitle2">Visitor</Text>
								</CardTitle>
								<CardAction className="rounded-full bg-orange-200 p-2 w-10 h-10 flex items-center justify-center">
									<Icon icon="mdi:users" size={20} color="black" />
								</CardAction>
							</CardHeader>
							<CardContent>
								<Title as="h3" className="text-xl">
									{visitor.value.toLocaleString()}
								</Title>
								<div className="flex flex-row gap-2 items-center">
									<Trend value={visitor.change} />
									<Text variant="caption" className="text-muted-foreground flex items-center">
										{visitor.tip}
									</Text>
								</div>
							</CardContent>
						</Card>
						<Card className="flex-1">
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle>
									<Text variant="subTitle2">Conversion rate</Text>
								</CardTitle>
								<CardAction className="rounded-full bg-emerald-200 p-2 w-10 h-10 flex items-center justify-center">
									<Icon icon="ph:seal-percent-fill" size={20} color="black" />
								</CardAction>
							</CardHeader>
							<CardContent>
								<Title as="h3" className="text-xl">
									{conversionRate.value}%
								</Title>
								<div className="flex flex-row gap-2 items-center">
									<Trend value={conversionRate.change} />
									<Text variant="caption" className="text-muted-foreground flex items-center">
										{conversionRate.tip}
									</Text>
								</div>
							</CardContent>
						</Card>
						<Card className="flex-1">
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle>
									<Text variant="subTitle2">Ad campaign clicks</Text>
								</CardTitle>
								<CardAction className="rounded-full bg-purple-200 p-2 w-10 h-10 flex items-center justify-center">
									<Icon icon="heroicons-solid:cursor-click" size={20} color="black" />
								</CardAction>
							</CardHeader>
							<CardContent>
								<Title as="h3" className="text-xl">
									{adCampaign.value.toLocaleString()}
								</Title>
								<div className="flex flex-row gap-2 items-center">
									<Trend value={adCampaign.change} />
									<Text variant="caption" className="text-muted-foreground flex items-center">
										{adCampaign.tip}
									</Text>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-4">
				{/* Top pages */}
				<Card className="col-span-12 md:col-span-6 xl:col-span-4">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Top pages
							</Title>
						</CardTitle>
						<CardAction>
							<Button size="sm" variant="outline">
								<Icon icon="mdi:download" className="mr-1" />
								Export data
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr>
										<th className="text-left py-1">PAGE URL</th>
										<th className="text-right py-1">VIEWS</th>
										<th className="text-right py-1">UNIQUE VISITORS</th>
									</tr>
								</thead>
								<tbody>
									{topPages.map((row) => (
										<tr key={row.url} className="border-t">
											<td className="py-2">{row.url}</td>
											<td className="py-2">
												<div className="flex items-center gap-2 justify-end">
													{row.views.toLocaleString()} <Trend value={row.viewsChange} />
												</div>
											</td>
											<td className="py-2">
												<div className="flex items-center gap-2 justify-end">
													{row.unique.toLocaleString()} <Trend value={row.uniqueChange} />
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				{/* Session devices 饼图 */}
				<Card className="col-span-12 md:col-span-6 xl:col-span-4">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Session devices
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center gap-2">
							<div className="w-full max-w-[180px]">
								<Chart
									type="donut"
									height={320}
									options={deviceChartOptions}
									series={sessionDevices.map((d) => d.value)}
								/>
							</div>
							<div className="flex justify-center gap-4 mt-2">
								{sessionDevices.map((d) => (
									<div key={d.label} className="flex flex-col items-center gap-1">
										<Icon icon={d.icon} size={20} color={d.color} />
										<Text variant="body2">{d.label}</Text>
										<Text variant="body2" className="font-bold">
											{d.value}%
										</Text>
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Top channel */}
				<Card className="col-span-12 xl:col-span-4">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Top channel
							</Title>
						</CardTitle>
						<CardAction>
							<Button size="sm" variant="outline">
								<Icon icon="mdi:download" className="mr-1" />
								Export data
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4 mb-2">
							<Title as="h3" className="text-xl">
								{topChannels.reduce((acc, c) => acc + c.total, 0).toLocaleString()}
							</Title>
							<div className="flex items-center gap-2">
								<Trend value={2.6} />
								<Text variant="caption" className="text-muted-foreground">
									vs last month
								</Text>
							</div>
						</div>
						<table className="w-full text-sm">
							<thead>
								<tr>
									<th className="text-left py-1">CHANNEL</th>
									<th className="text-right py-1">PERCENTAGE</th>
									<th className="text-right py-1">TOTAL</th>
								</tr>
							</thead>
							<tbody>
								{topChannels.map((row) => (
									<tr key={row.name} className="border-t">
										<td className="py-2 flex items-center gap-2">
											<Icon icon={row.icon} size={18} />
											{row.name}
										</td>
										<td className="py-2 text-right">{row.percent}%</td>
										<td className="py-2 text-right">{row.total.toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>

				{/* Traffic data 表格 */}
				<Card className="col-span-12">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Traffic data
							</Title>
						</CardTitle>
						<CardAction>
							<Button size="sm" variant="outline">
								<Icon icon="mdi:download" className="mr-1" />
								Export data
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr>
										<th className="text-left p-2">SOURCE</th>
										<th className="text-right p-2">VISITS</th>
										<th className="text-right p-2">UNIQUE VISITORS</th>
										<th className="text-right p-2">BOUNCE RATE</th>
										<th className="text-right p-2">AVG. SESSION DURATION</th>
										<th className="text-left p-2">PROGRESS TO GOAL (%)</th>
									</tr>
								</thead>
								<tbody>
									{trafficData.map((row) => (
										<tr key={row.source} className="border-t">
											<td className="p-2 font-mono">{row.source}</td>
											<td className="p-2 text-right">{row.visits.toLocaleString()}</td>
											<td className="p-2 text-right">{row.unique.toLocaleString()}</td>
											<td className="p-2 text-right">
												<div className="flex items-center gap-2 justify-end">
													<Trend value={row.bounce} />
												</div>
											</td>
											<td className="p-2 text-right">{row.duration}</td>
											<td className="p-2">
												<div className="flex items-center gap-2">
													<Progress value={row.progress} />
													<span className="text-xs ml-2 align-middle">{row.progress}%</span>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
