import {
	Button,
	ColorPicker,
	DatePicker,
	Flex,
	Form,
	Input,
	Modal,
	message,
	Radio,
	Segmented,
	Select,
	Switch,
	Typography,
	Upload,
} from "antd";
import type { Color } from "antd/es/color-picker";
import type { Dayjs } from "dayjs";
import { type CSSProperties, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";
import { Markdown } from "./markdown";
import { getRecordThemeLabel, type RecordThemeOption, type WorkRecord } from "./types";

interface RecordFormValues {
	title: string;
	description?: string;
	theme: string;
	time?: [Dayjs, Dayjs];
}

interface Props {
	open: boolean;
	date: Dayjs;
	themes: RecordThemeOption[];
	onCancel: () => void;
	onCreate: (value: Omit<WorkRecord, "id" | "createdAt">) => void;
	onAddTheme: (theme: RecordThemeOption) => void;
	onDeleteTheme: (value: string) => void;
	onImport: (file: File) => Promise<boolean>;
}

export function RecordFormModal({
	open,
	date,
	themes,
	onCancel,
	onCreate,
	onAddTheme,
	onDeleteTheme,
	onImport,
}: Props) {
	const { t } = useTranslation();
	const [form] = Form.useForm<RecordFormValues>();
	const [creationMode, setCreationMode] = useState<"quick" | "detail">("quick");
	const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
	const [addingTheme, setAddingTheme] = useState(false);
	const [themeName, setThemeName] = useState("");
	const [themeColor, setThemeColor] = useState("#1677ff");
	const description = Form.useWatch("description", form) ?? "";

	const close = () => {
		form.resetFields();
		setCreationMode("quick");
		setContentMode("edit");
		setAddingTheme(false);
		onCancel();
	};

	const addTheme = () => {
		const label = themeName.trim();
		if (!label) return message.warning(t("sys.record.form.themeNameRequired"));
		const theme = { value: `custom_${Date.now().toString(36)}`, label, color: themeColor, custom: true };
		onAddTheme(theme);
		form.setFieldValue("theme", theme.value);
		setThemeName("");
		setAddingTheme(false);
	};
	const deleteTheme = (value: string) => {
		if (form.getFieldValue("theme") === value) form.setFieldValue("theme", "other");
		onDeleteTheme(value);
		message.success(t("sys.record.form.themeDeleted"));
	};

	return (
		<Modal
			title={t("sys.record.form.title", { date: date.format("YYYY-MM-DD") })}
			open={open}
			onCancel={close}
			onOk={() => form.submit()}
			okText={creationMode === "quick" ? t("sys.record.form.quickSave") : t("sys.record.form.save")}
			cancelText={t("sys.record.form.cancel")}
			width={creationMode === "quick" ? 520 : 680}
			destroyOnClose
		>
			<CreationSwitch
				block
				value={creationMode}
				onChange={(value) => setCreationMode(value as "quick" | "detail")}
				options={[
					{ label: t("sys.record.form.quickCreate"), value: "quick" },
					{ label: t("sys.record.form.detailCreate"), value: "detail" },
				]}
			/>
			<Form
				form={form}
				layout="vertical"
				initialValues={{ theme: "development" }}
				preserve
				onFinish={(values) => {
					onCreate({
						date: date.format("YYYY-MM-DD"),
						title: values.title.trim(),
						description: creationMode === "detail" ? values.description?.trim() || undefined : undefined,
						theme: values.theme,
						startTime: creationMode === "detail" ? values.time?.[0].format("HH:mm") : undefined,
						endTime: creationMode === "detail" ? values.time?.[1].format("HH:mm") : undefined,
					});
					form.resetFields();
					setCreationMode("quick");
					setContentMode("edit");
				}}
			>
				<Form.Item
					name="title"
					label={t("sys.record.form.recordTitle")}
					rules={[{ required: true, whitespace: true, message: t("sys.record.form.recordTitleRequired") }]}
				>
					<Input autoFocus maxLength={80} showCount placeholder={t("sys.record.form.recordTitlePlaceholder")} />
				</Form.Item>
				{creationMode === "quick" && (
					<Form.Item name="theme" label={t("sys.record.form.theme")}>
						<Select
							options={themes.map((theme) => ({
								value: theme.value,
								label: (
									<ThemeSelectLabel>
										<ThemeDot $color={theme.color} />
										{getRecordThemeLabel(theme, t)}
									</ThemeSelectLabel>
								),
							}))}
						/>
					</Form.Item>
				)}

				{creationMode === "detail" && (
					<>
						<Form.Item
							label={
								<Flex align="center" gap={8}>
									<span>{t("sys.record.form.theme")}</span>
									<Button
										type="link"
										size="small"
										icon={<Icon icon="solar:add-circle-linear" size={16} />}
										onClick={() => setAddingTheme((value) => !value)}
									>
										{t("sys.record.form.newTheme")}
									</Button>
								</Flex>
							}
						>
							<Form.Item name="theme" noStyle>
								<ThemeGroup>
									{themes.map((theme) => (
										<ThemeChoice key={theme.value} style={{ "--record-theme-color": theme.color } as CSSProperties}>
											<Radio.Button value={theme.value} className={theme.custom ? "has-delete" : undefined}>
												<ThemeDot $color={theme.color} />
												{getRecordThemeLabel(theme, t)}
											</Radio.Button>
											{theme.custom && (
												<DeleteTheme
													type="text"
													size="small"
													icon={<Icon icon="solar:close-circle-bold" size={15} />}
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														deleteTheme(theme.value);
													}}
													aria-label={t("sys.record.form.deleteTheme", { name: theme.label })}
												/>
											)}
										</ThemeChoice>
									))}
								</ThemeGroup>
							</Form.Item>
							{addingTheme && (
								<Flex gap={8} align="center" style={{ marginTop: 12 }}>
									<Input
										value={themeName}
										onChange={(event) => setThemeName(event.target.value)}
										placeholder={t("sys.record.form.themeNamePlaceholder")}
										maxLength={20}
									/>
									<ColorPicker value={themeColor} onChange={(color: Color) => setThemeColor(color.toHexString())} />
									<Button onClick={addTheme}>{t("sys.record.form.add")}</Button>
								</Flex>
							)}
						</Form.Item>
						<Form.Item name="time" label={t("sys.record.form.time")}>
							<DatePicker.RangePicker picker="time" format="HH:mm" minuteStep={5} style={{ width: "100%" }} />
						</Form.Item>
						<Form.Item
							label={
								<Flex justify="space-between" align="center">
									<span>{t("sys.record.form.details")}</span>
									<Switch
										size="small"
										checked={contentMode === "preview"}
										onChange={(checked) => setContentMode(checked ? "preview" : "edit")}
										checkedChildren={t("sys.record.form.preview")}
										unCheckedChildren={t("sys.record.form.edit")}
									/>
								</Flex>
							}
						>
							<Form.Item name="description" noStyle>
								<Input.TextArea
									style={{ display: contentMode === "edit" ? "block" : "none" }}
									rows={9}
									maxLength={5000}
									showCount
									placeholder={t("sys.record.form.markdownPlaceholder")}
								/>
							</Form.Item>
							{contentMode === "preview" && (
								<Preview>
									{description ? (
										<Markdown>{description}</Markdown>
									) : (
										<Typography.Text type="secondary">{t("sys.record.form.nothingToPreview")}</Typography.Text>
									)}
								</Preview>
							)}
						</Form.Item>
						<UploadArea>
							<div>
								<Typography.Text strong>{t("sys.record.form.importTitle")}</Typography.Text>
								<br />
								<Typography.Text type="secondary">{t("sys.record.form.importHint")}</Typography.Text>
							</div>
							<Upload accept="application/json,.json" showUploadList={false} beforeUpload={onImport}>
								<Button icon={<Icon icon="solar:import-bold-duotone" size={18} />}>
									{t("sys.record.form.uploadJson")}
								</Button>
							</Upload>
						</UploadArea>
					</>
				)}
			</Form>
		</Modal>
	);
}

const CreationSwitch = styled(
	Segmented,
)`margin-bottom: 20px; padding: 4px; background: color-mix(in srgb, ${themeVars.colors.palette.primary.default} 10%, transparent); .ant-segmented-thumb, .ant-segmented-item-selected { color: white !important; background: ${themeVars.colors.palette.primary.default} !important; box-shadow: 0 2px 8px color-mix(in srgb, ${themeVars.colors.palette.primary.default} 28%, transparent) !important; } .ant-segmented-item-selected .ant-segmented-item-label { color: white !important; font-weight: 600; }`;
const ThemeGroup = styled(
	Radio.Group,
)`display: flex; flex-wrap: wrap; gap: 12px; .ant-radio-button-wrapper { display: inline-flex; align-items: center; gap: 7px; height: 36px; margin: 0 !important; color: var(--record-theme-color); border: 1px solid color-mix(in srgb, var(--record-theme-color) 42%, white); border-inline-start-width: 1px !important; border-radius: 8px !important; background: color-mix(in srgb, var(--record-theme-color) 12%, white); transition: color 160ms ease, border-color 160ms ease, background 160ms ease; } .ant-radio-button-wrapper.has-delete { padding-right: 34px; } .ant-radio-button-wrapper:hover, .ant-radio-button-wrapper-checked { color: white !important; border-color: var(--record-theme-color) !important; background: var(--record-theme-color) !important; box-shadow: none !important; } .ant-radio-button-wrapper::before { display: none !important; }`;
const ThemeChoice = styled.span`position: relative; display: inline-flex; margin: 0 4px 6px 0; &:hover > .ant-btn { color: white; }`;
const DeleteTheme = styled(
	Button,
)`&& { position: absolute; top: 2px; right: 2px; z-index: 1; width: 30px; height: 32px; padding: 0; color: var(--record-theme-color); background: transparent; } &&:hover { color: white !important; background: rgb(255 255 255 / 16%) !important; }`;
const ThemeDot = styled.span<{
	$color: string;
}>`width: 9px; height: 9px; flex: none; border-radius: 50%; background: ${({ $color }) => $color};`;
const ThemeSelectLabel = styled.span`display: inline-flex; align-items: center; gap: 8px;`;
const Preview = styled.div`min-height: 210px; padding: 12px; border: 1px solid #d9d9d9; border-radius: 8px;`;
const UploadArea = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border: 1px dashed #d9d9d9; border-radius: 10px;`;
