import { Checkbox, ConfigProvider, DatePicker, Form, InputNumber, Select, Switch } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import subscriptionService, {
	type Currency,
	currencies,
	type Device,
	type Subscription,
	type SubscriptionInput,
} from "@/api/services/subscriptionService";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettings } from "@/store/settingStore";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/ui/sheet";
import { GlassAction } from "./glass";

interface Values {
	name: string;
	devices: Device[];
	startDate: Dayjs;
	endDate?: Dayjs | null;
	preset: string;
	customInterval: number;
	customUnit: "day" | "month" | "year";
	amount: string;
	currency: Currency;
	autoRenew: boolean;
}

function presetOf(item?: Subscription): string {
	if (!item) return "monthly";
	if (item.cycleUnit === "once") return "once";
	if (item.cycleUnit === "year" && item.cycleInterval === 1) return "annual";
	if (item.cycleUnit === "month")
		return (
			({ 1: "monthly", 3: "quarterly", 6: "semiannual" } as Record<number, string>)[item.cycleInterval] ?? "custom"
		);
	return "custom";
}

export function SubscriptionForm({
	open,
	item,
	currency,
	onClose,
	onSaved,
}: {
	open: boolean;
	item?: Subscription;
	currency: Currency;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { t } = useTranslation();
	const label = (key: string) => t(`subscriptions.${key}`);
	const mobile = useMediaQuery({ maxWidth: 767 });
	const { themeMode } = useSettings();
	const [form] = Form.useForm<Values>();
	const [saving, setSaving] = useState(false);
	const savingRef = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const preset = Form.useWatch("preset", form);
	const autoRenew = Form.useWatch("autoRenew", form);

	useEffect(() => {
		if (!open) return;
		form.resetFields();
		form.setFieldsValue({
			name: item?.name ?? "",
			devices: item?.devices ?? ["computer"],
			startDate: item
				? dayjs(item.startDate)
				: dayjs(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date())),
			endDate: item?.endDate ? dayjs(item.endDate) : null,
			preset: presetOf(item),
			customInterval: item?.cycleInterval ?? 1,
			customUnit: item?.cycleUnit === "once" ? "month" : (item?.cycleUnit ?? "month"),
			amount: item?.amount ?? "",
			currency: item?.currency ?? currency,
			autoRenew: item?.autoRenew ?? true,
		});
	}, [open, item, currency, form]);

	const submit = async (values: Values) => {
		if (savingRef.current) return;
		savingRef.current = true;
		setSaving(true);
		const fixed = {
			monthly: { cycleUnit: "month", cycleInterval: 1 },
			quarterly: { cycleUnit: "month", cycleInterval: 3 },
			semiannual: { cycleUnit: "month", cycleInterval: 6 },
			annual: { cycleUnit: "year", cycleInterval: 1 },
			once: { cycleUnit: "once", cycleInterval: 1 },
		} as const;
		const cycle =
			values.preset === "custom"
				? { cycleUnit: values.customUnit, cycleInterval: values.customInterval }
				: fixed[values.preset as keyof typeof fixed];
		const payload: SubscriptionInput = {
			name: values.name.trim(),
			devices: values.devices,
			startDate: values.startDate.format("YYYY-MM-DD"),
			endDate: values.endDate?.format("YYYY-MM-DD") ?? null,
			...cycle,
			amount: values.amount.trim(),
			currency: values.currency,
			autoRenew: values.preset !== "once" && values.autoRenew,
		};
		try {
			if (item) await subscriptionService.update(item.id, payload);
			else await subscriptionService.create(payload);
			toast.success(label("saved"));
			onSaved();
			onClose();
		} catch {
			// The shared API client displays the server error and the form retains its values.
		} finally {
			savingRef.current = false;
			setSaving(false);
		}
	};

	const title = item ? label("edit") : label("add");
	const contents = (
		<ConfigProvider getPopupContainer={() => containerRef.current ?? document.body}>
			<Form
				className="subscription-form"
				form={form}
				layout="vertical"
				onFinish={submit}
				disabled={saving}
				requiredMark={false}
			>
				<div ref={containerRef} className="subscription-form-body">
					<Form.Item
						name="name"
						label={label("name")}
						rules={[
							{ required: true, whitespace: true, message: label("nameRequired") },
							{ max: 200, message: label("nameRequired") },
						]}
					>
						<Input autoFocus disabled={saving} maxLength={200} placeholder={label("namePlaceholder")} />
					</Form.Item>
					<Form.Item
						name="devices"
						label={label("devices")}
						rules={[{ required: true, type: "array", min: 1, message: label("deviceRequired") }]}
					>
						<Checkbox.Group
							options={["phone", "computer", "other"].map((value) => ({ value, label: label(`device.${value}`) }))}
						/>
					</Form.Item>
					<div className="subscription-form-grid">
						<Form.Item
							name="startDate"
							label={label("startDate")}
							rules={[{ required: true, message: label("dateRequired") }]}
						>
							<DatePicker allowClear={false} format="YYYY-MM-DD" className="w-full" inputReadOnly={mobile} />
						</Form.Item>
						<Form.Item
							name="endDate"
							label={label("endDate")}
							dependencies={["startDate"]}
							rules={[
								{
									validator: (_, value: Dayjs | null) =>
										!value || value.isAfter(form.getFieldValue("startDate"), "day")
											? Promise.resolve()
											: Promise.reject(new Error(label("endAfterStart"))),
								},
							]}
						>
							<DatePicker placeholder={label("noEnd")} format="YYYY-MM-DD" className="w-full" inputReadOnly={mobile} />
						</Form.Item>
					</div>
					<p className="subscription-field-hint">{label("stopHint")}</p>
					<Form.Item name="preset" label={label("cycle")} rules={[{ required: true }]}>
						<Select
							options={["monthly", "quarterly", "semiannual", "annual", "custom", "once"].map((value) => ({
								value,
								label: label(`cycles.${value}`),
							}))}
						/>
					</Form.Item>
					{preset === "custom" && (
						<div className="subscription-form-grid">
							<Form.Item
								name="customInterval"
								label={label("every")}
								rules={[{ required: true, type: "integer", min: 1, max: 1200, message: label("intervalRequired") }]}
							>
								<InputNumber min={1} max={1200} precision={0} className="w-full" />
							</Form.Item>
							<Form.Item name="customUnit" label={label("unit")} rules={[{ required: true }]}>
								<Select
									options={["day", "month", "year"].map((value) => ({ value, label: label(`units.${value}`) }))}
								/>
							</Form.Item>
						</div>
					)}
					<div className="subscription-form-grid">
						<Form.Item
							name="amount"
							label={label("amount")}
							rules={[
								{ required: true, whitespace: true, message: label("amountRequired") },
								{
									validator: (_, value: string) =>
										!value?.trim() || /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value.trim())
											? Promise.resolve()
											: Promise.reject(new Error(label("amountRequired"))),
								},
							]}
						>
							<Input disabled={saving} inputMode="decimal" placeholder="0.00" maxLength={15} />
						</Form.Item>
						<Form.Item name="currency" label={label("currency")} rules={[{ required: true }]}>
							<Select options={currencies.map((value) => ({ value, label: value }))} />
						</Form.Item>
					</div>
					{preset !== "once" && (
						<div className="subscription-renew-field">
							<div>
								<strong>{label("autoRenew")}</strong>
								<p>{label(autoRenew ? "autoRenewHint" : "manualRenewHint")}</p>
							</div>
							<Form.Item name="autoRenew" valuePropName="checked" noStyle>
								<Switch aria-label={label("autoRenew")} />
							</Form.Item>
						</div>
					)}
				</div>
				<div className="subscription-form-footer">
					<Button type="button" variant="outline" disabled={saving} onClick={onClose}>
						{label("cancel")}
					</Button>
					<GlassAction type="submit" variant="filled" disabled={saving}>
						{label(saving ? "saving" : "save")}
					</GlassAction>
				</div>
			</Form>
		</ConfigProvider>
	);
	const changeOpen = (value: boolean) => {
		if (!value && !savingRef.current) onClose();
	};
	const focusName = (event: Event) => {
		event.preventDefault();
		containerRef.current?.querySelector<HTMLInputElement>('input[id$="_name"], input[maxlength="200"]')?.focus();
	};
	if (mobile)
		return (
			<Sheet open={open} onOpenChange={changeOpen}>
				<SheetContent
					side="bottom"
					data-theme={themeMode}
					className="subscription-modal subscription-mobile-sheet"
					onOpenAutoFocus={focusName}
					onEscapeKeyDown={(event) => {
						if (saving) event.preventDefault();
					}}
				>
					<div className="subscription-modal-header">
						<SheetTitle>{title}</SheetTitle>
						<SheetDescription>{label("formDescription")}</SheetDescription>
					</div>
					{contents}
				</SheetContent>
			</Sheet>
		);
	return (
		<Dialog open={open} onOpenChange={changeOpen}>
			<DialogContent
				data-theme={themeMode}
				className="subscription-modal sm:max-w-[560px]"
				onOpenAutoFocus={focusName}
				onEscapeKeyDown={(event) => {
					if (saving) event.preventDefault();
				}}
			>
				<div className="subscription-modal-header">
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{label("formDescription")}</DialogDescription>
				</div>
				{contents}
			</DialogContent>
		</Dialog>
	);
}
