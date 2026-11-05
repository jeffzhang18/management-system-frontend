import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassInput, GlassSegmented } from "@zakisheriff/liquid-glass";
import { Alert, App, Empty, Select, Skeleton, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
	ArrowDownUp,
	ArrowUpRight,
	CalendarClock,
	CreditCard,
	Laptop,
	Layers3,
	MoreHorizontal,
	Pencil,
	Plus,
	RefreshCw,
	Smartphone,
	Trash2,
} from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import subscriptionService, {
	type Currency,
	currencies,
	type Device,
	type Subscription,
} from "@/api/services/subscriptionService";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettings } from "@/store/settingStore";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { GlassAction, GlassPanel } from "./glass";
import { convertAmount, formatMoney } from "./money";
import { SubscriptionForm } from "./subscription-form";
import "./subscriptions.css";

function initialCurrency(): Currency {
	try {
		const value = localStorage.getItem("subscriptions.displayCurrency");
		return currencies.includes(value as Currency) ? (value as Currency) : "CNY";
	} catch {
		return "CNY";
	}
}

const EMPTY_SUBSCRIPTIONS: Subscription[] = [];

const SubscriptionTable = memo(function SubscriptionTable({
	items,
	columns,
}: {
	items: Subscription[];
	columns: ColumnsType<Subscription>;
}) {
	return (
		<Table<Subscription>
			rowKey="id"
			dataSource={items}
			columns={columns}
			scroll={{ x: 1035 }}
			pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
		/>
	);
});

export default function SubscriptionsPage() {
	const { t, i18n } = useTranslation();
	const label = useCallback((key: string) => t(`subscriptions.${key}`), [t]);
	const { modal } = App.useApp();
	const queryClient = useQueryClient();
	const user = useUserInfo();
	const { themeMode } = useSettings();
	const mobile = useMediaQuery({ maxWidth: 767 });
	const [currency, setCurrency] = useState<Currency>(initialCurrency);
	const [search, setSearch] = useState("");
	const [device, setDevice] = useState<Device | "all">("all");
	const [filter, setFilter] = useState(0);
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Subscription>();
	const [deleting, setDeleting] = useState<string>();
	const addRef = useRef<HTMLButtonElement>(null);
	const editTrigger = useRef<HTMLElement | null>(null);
	const queryKey = useMemo(() => ["subscriptions", user.id], [user.id]);
	const list = useQuery({
		queryKey: [...queryKey, "list"],
		queryFn: subscriptionService.list,
		retry: false,
		refetchInterval: 60_000,
	});
	const summary = useQuery({
		queryKey: [...queryKey, "summary", currency],
		queryFn: () => subscriptionService.summary(currency),
		retry: false,
		refetchInterval: 60_000,
	});
	const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);
	const money = useCallback(
		(amount?: string | null, unit = currency) => formatMoney(amount, unit, i18n.language),
		[currency, i18n.language],
	);
	const items = list.data?.items ?? EMPTY_SUBSCRIPTIONS;
	const visible = useMemo(
		() =>
			items.filter(
				(item) =>
					item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
					(device === "all" || item.devices.includes(device)) &&
					(filter === 0 ||
						(filter === 1 && item.status === "active") ||
						(filter === 2 && item.upcoming) ||
						(filter === 3 && item.status === "ended")),
			),
		[items, search, device, filter],
	);
	const exchange = summary.data?.exchange;
	const openAdd = () => {
		setEditing(undefined);
		editTrigger.current = null;
		setFormOpen(true);
	};
	const openEdit = useCallback((item: Subscription) => {
		editTrigger.current = document.activeElement as HTMLElement;
		setEditing(item);
		setFormOpen(true);
	}, []);
	const closeForm = () => {
		setFormOpen(false);
		requestAnimationFrame(() => {
			if (editTrigger.current?.isConnected) editTrigger.current.focus();
			else addRef.current?.focus();
		});
	};
	const cycleLabel = useCallback(
		(item: Subscription) => {
			if (item.cycleUnit === "once") return label("cycles.once");
			if (item.cycleUnit === "year" && item.cycleInterval === 1) return label("cycles.annual");
			if (item.cycleUnit === "month") {
				const key = ({ 1: "monthly", 3: "quarterly", 6: "semiannual" } as Record<number, string>)[item.cycleInterval];
				if (key) return label(`cycles.${key}`);
			}
			return t("subscriptions.customCycle", { count: item.cycleInterval, unit: label(`units.${item.cycleUnit}`) });
		},
		[label, t],
	);
	const remove = useCallback(
		(item: Subscription) => {
			modal.confirm({
				title: label("delete"),
				content: t("subscriptions.deleteConfirm", { name: item.name }),
				okText: label("delete"),
				cancelText: label("cancel"),
				okButtonProps: { danger: true },
				onOk: async () => {
					setDeleting(item.id);
					try {
						await subscriptionService.remove(item.id);
						toast.success(label("deleted"));
						await refresh();
					} finally {
						setDeleting(undefined);
					}
				},
			});
		},
		[modal, label, t, refresh],
	);
	const actions = useCallback(
		(item: Subscription) => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("subscriptions.actionsFor", { name: item.name })}
						disabled={deleting === item.id}
					>
						<MoreHorizontal size={18} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => openEdit(item)}>
						<Pencil size={15} />
						{label("edit")}
					</DropdownMenuItem>
					<DropdownMenuItem className="text-red-500" onSelect={() => remove(item)}>
						<Trash2 size={15} />
						{label("delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
		[deleting, t, openEdit, remove, label],
	);
	const status = useCallback(
		(item: Subscription) => (
			<Tag
				bordered={false}
				color={
					item.upcoming
						? "orange"
						: item.status === "active"
							? "green"
							: item.status === "scheduled"
								? "blue"
								: "default"
				}
			>
				{label(item.upcoming ? "status.upcoming" : `status.${item.status}`)}
			</Tag>
		),
		[label],
	);
	const devices = useCallback(
		(item: Subscription) => (
			<div className="subscription-devices">
				{item.devices.map((value) => {
					const Icon = value === "phone" ? Smartphone : value === "computer" ? Laptop : Layers3;
					return (
						<span key={value}>
							<Icon size={13} />
							{label(`device.${value}`)}
						</span>
					);
				})}
			</div>
		),
		[label],
	);
	const price = useCallback(
		(item: Subscription) => {
			const converted = convertAmount(item.amount, item.currency, currency, exchange);
			return (
				<div className="subscription-price">
					<strong>{money(item.amount, item.currency)}</strong>
					<span>{cycleLabel(item)}</span>
					{item.currency !== currency && (
						<small>{converted == null ? label("conversionUnavailable") : `≈ ${money(converted)}`}</small>
					)}
				</div>
			);
		},
		[currency, exchange, money, cycleLabel, label],
	);
	const name = useCallback(
		(item: Subscription) => (
			<div className="subscription-name">
				<span className={`subscription-avatar subscription-avatar-${(item.name.codePointAt(0) ?? 0) % 5}`}>
					{Array.from(item.name)[0]?.toUpperCase()}
				</span>
				<div>
					<strong>{item.name}</strong>
					{status(item)}
				</div>
			</div>
		),
		[status],
	);
	const nextDate = useCallback(
		(item: Subscription) => (
			<div className="subscription-next">
				{item.nextRenewalDate ? (
					<>
						<strong>{item.nextRenewalDate}</strong>
						<span>{label("nextRenewal")}</span>
					</>
				) : item.expiresOn ? (
					<>
						<strong>{item.expiresOn}</strong>
						<span>{label("expiresOn")}</span>
					</>
				) : (
					<span>{label(item.cycleUnit === "once" ? "lifetime" : "noRenewal")}</span>
				)}
			</div>
		),
		[label],
	);
	const columns: ColumnsType<Subscription> = useMemo(
		() => [
			{
				title: label("name"),
				key: "name",
				width: 230,
				render: (_, item) => name(item),
				sorter: (a, b) => a.name.localeCompare(b.name),
			},
			{ title: label("devices"), key: "devices", width: 155, render: (_, item) => devices(item) },
			{ title: label("cyclePrice"), key: "price", width: 180, render: (_, item) => price(item) },
			{ title: label("startDate"), dataIndex: "startDate", width: 130 },
			{ title: label("endDate"), key: "endDate", width: 130, render: (_, item) => item.endDate ?? "—" },
			{
				title: label("nextDate"),
				key: "next",
				width: 155,
				render: (_, item) => nextDate(item),
				sorter: (a, b) =>
					(a.nextRenewalDate ?? a.expiresOn ?? "9999").localeCompare(b.nextRenewalDate ?? b.expiresOn ?? "9999"),
			},
			{
				title: <span className="sr-only">{label("actions")}</span>,
				key: "actions",
				width: 55,
				render: (_, item) => actions(item),
			},
		],
		[label, name, devices, price, nextDate, actions],
	);
	const metrics = [
		{
			key: "activeCount",
			label: label("activeCount"),
			value: summary.data?.activeCount?.toString(),
			icon: Layers3,
			foot: label("activeHint"),
			className: "metric-blue",
		},
		{
			key: "monthly",
			label: label("monthly"),
			value: money(summary.data?.monthlyEstimate),
			icon: CreditCard,
			foot: label("estimate"),
			className: "metric-purple",
		},
		{
			key: "annual",
			label: label("annual"),
			value: money(summary.data?.annualEstimate),
			icon: ArrowUpRight,
			foot: label("estimate"),
			className: "metric-teal",
		},
		{
			key: "upcoming",
			label: label("upcoming30"),
			value: money(summary.data?.upcoming30Days),
			icon: CalendarClock,
			foot: label("upcomingHint"),
			className: "metric-orange",
		},
	];
	return (
		<div className="subscriptions-page" data-theme={themeMode}>
			<header className="subscription-header">
				<div>
					<h1>{label("title")}</h1>
					<p>{label("description")}</p>
				</div>
				<div className="subscription-header-actions">
					<div className="subscription-currency">
						<ArrowDownUp size={15} />
						<span className="sr-only">{label("displayCurrency")}</span>
						<Select
							aria-label={label("displayCurrency")}
							value={currency}
							variant="borderless"
							onChange={(value: Currency) => {
								setCurrency(value);
								try {
									localStorage.setItem("subscriptions.displayCurrency", value);
								} catch {
									/* Preference storage is optional. */
								}
							}}
							options={currencies.map((value) => ({ value, label: value }))}
						/>
					</div>
					<GlassAction ref={addRef} variant="filled" icon={<Plus size={16} />} onClick={openAdd}>
						{label("add")}
					</GlassAction>
				</div>
			</header>
			<section className="subscription-metrics" aria-label={label("overview")}>
				{metrics.map((metric) => (
					<GlassPanel key={metric.key} className={`subscription-metric ${metric.className}`}>
						<div className="subscription-metric-heading">
							<span>{metric.label}</span>
							<span className="subscription-metric-icon">
								<metric.icon size={18} />
							</span>
						</div>
						{summary.isPending ? (
							<Skeleton.Input active style={{ width: "80%", margin: "8px 0" }} />
						) : (
							<strong className="subscription-metric-value">{summary.isError ? "—" : (metric.value ?? "—")}</strong>
						)}
						<span className="subscription-metric-foot">{metric.foot}</span>
					</GlassPanel>
				))}
			</section>
			<output className="subscription-rate-note">
				<ArrowDownUp size={13} />
				{summary.isPending
					? label("ratesLoading")
					: summary.isError
						? label("summaryFailed")
						: !exchange?.available
							? label("ratesUnavailable")
							: t(exchange.stale ? "subscriptions.ratesCached" : "subscriptions.ratesAsOf", {
									date: exchange.rateDate,
								})}
				{exchange?.available && (
					<span className="subscription-rate-pairs">{`1 USD ≈ ${exchange.rates?.CNY.toFixed(4)} CNY · ${exchange.rates?.AUD.toFixed(4)} AUD`}</span>
				)}
				{(summary.isError || exchange?.stale) && (
					<Button variant="ghost" size="sm" onClick={() => void summary.refetch()} disabled={summary.isFetching}>
						{label("retry")}
					</Button>
				)}
			</output>
			<Card className="subscription-list-panel">
				<div className="subscription-list-heading">
					<div>
						<h2>
							{label("allSubscriptions")}
							<span className="subscription-count">{items.length}</span>
						</h2>
						<p>{label("listHint")}</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						aria-label={label("refresh")}
						onClick={() => void refresh()}
						disabled={list.isFetching || summary.isFetching}
					>
						<RefreshCw size={16} />
					</Button>
				</div>
				<div className="subscription-toolbar">
					<GlassSegmented
						aria-label={label("statusFilter")}
						value={filter}
						onChange={setFilter}
						size="sm"
						intensity={1}
						options={["all", "active", "upcoming", "ended"].map((key) => label(`filters.${key}`))}
					/>
					<div className="subscription-search-controls">
						<GlassInput
							intensity={1}
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							onClear={() => setSearch("")}
							placeholder={label("search")}
							aria-label={label("search")}
						/>
						<Select
							aria-label={label("deviceFilter")}
							value={device}
							onChange={setDevice}
							className="subscription-device-filter"
							options={[
								{ value: "all", label: label("allDevices") },
								...["phone", "computer", "other"].map((value) => ({ value, label: label(`device.${value}`) })),
							]}
						/>
					</div>
				</div>
				{list.isError && (
					<Alert
						type="error"
						showIcon
						message={label("loadFailed")}
						action={
							<Button variant="outline" size="sm" onClick={() => void list.refetch()}>
								{label("retry")}
							</Button>
						}
					/>
				)}
				{list.isError && !list.data ? null : list.isPending ? (
					<div className="subscription-loading">
						<Skeleton active paragraph={{ rows: 5 }} />
					</div>
				) : !visible.length ? (
					<div className="subscription-empty">
						<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={label(items.length ? "noResults" : "empty")} />
						{!items.length && (
							<GlassAction icon={<Plus size={16} />} onClick={openAdd}>
								{label("addFirst")}
							</GlassAction>
						)}
					</div>
				) : !mobile ? (
					<SubscriptionTable items={visible} columns={columns} />
				) : (
					<div className="subscription-mobile-list">
						{visible.map((item) => (
							<article className="subscription-mobile-card" key={item.id}>
								<div className="subscription-mobile-top">
									{name(item)}
									{actions(item)}
								</div>
								<div className="subscription-mobile-middle">
									{price(item)}
									{nextDate(item)}
								</div>
								<div className="subscription-mobile-bottom">
									{devices(item)}
									<span>
										{label("startDate")} {item.startDate}
									</span>
								</div>
								{item.endDate && (
									<p className="subscription-mobile-stop">
										{label("endDate")} {item.endDate}
									</p>
								)}
							</article>
						))}
					</div>
				)}
				<div className="subscription-list-footer">
					<span>{label("originalPriceHint")}</span>
					<span>{label("timezone")}</span>
				</div>
			</Card>
			<SubscriptionForm
				open={formOpen}
				item={editing}
				currency={currency}
				onClose={closeForm}
				onSaved={() => {
					void refresh();
				}}
			/>
		</div>
	);
}
