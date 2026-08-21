import {
	ColorPicker,
	Flex,
	Form,
	Input,
	Modal,
	message,
	Radio,
	Segmented,
	Select,
	Tooltip,
	Typography,
	Upload,
} from "antd";
import type { Color } from "antd/es/color-picker";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";
import { GuidedTimeRangePicker } from "./guided-time-range-picker";
import { Markdown } from "./markdown";
import { getRecordThemeLabel, type RecordThemeOption } from "./types";

interface RecordFormValues {
	title: string;
	description?: string;
	theme?: string;
	time?: [Dayjs, Dayjs];
}

export interface CreateRecordFormPayload {
	date: string;
	title: string;
	theme?: string;
	description?: string;
	startTime?: string;
	endTime?: string;
}

interface Props {
	open: boolean;
	date: Dayjs;
	themes: RecordThemeOption[];
	onCancel: () => void;
	onCreate: (value: CreateRecordFormPayload) => Promise<void> | void;
	onAddTheme: (theme: RecordThemeOption) => Promise<RecordThemeOption | void> | RecordThemeOption | void;
	onImport: (file: File) => Promise<boolean>;
}

export function RecordFormModal({
	open,
	date,
	themes,
	onCancel,
	onCreate,
	onAddTheme,
	onImport,
}: Props) {
	const { t } = useTranslation();
	const [form] = Form.useForm<RecordFormValues>();
	const [creationMode, setCreationMode] = useState<"quick" | "detail">("quick");
	const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
	const [detailToggleDrag, setDetailToggleDrag] = useState<number | null>(null);
	const detailToggleDragStart = useRef({ x: 0, offset: 0 });
	const detailToggleMoved = useRef(false);
	const detailTogglePointer = useRef<number | null>(null);
	const [addingTheme, setAddingTheme] = useState(false);
	const [themeName, setThemeName] = useState("");
	const [themeColor, setThemeColor] = useState("#1677ff");
	const hasThemeOptions = themes.length > 0;
	const description = Form.useWatch("description", form) ?? "";

	const startDetailToggleDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		detailTogglePointer.current = event.pointerId;
		detailToggleDragStart.current = { x: event.clientX, offset: contentMode === "preview" ? 52 : 0 };
		detailToggleMoved.current = false;
	};

	const moveDetailToggleDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (detailTogglePointer.current !== event.pointerId) return;
		const distance = event.clientX - detailToggleDragStart.current.x;
		if (!detailToggleMoved.current && Math.abs(distance) > 3) {
			detailToggleMoved.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		if (!detailToggleMoved.current) return;
		setDetailToggleDrag(Math.min(52, Math.max(0, detailToggleDragStart.current.offset + distance)));
	};

	const endDetailToggleDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (detailTogglePointer.current !== event.pointerId) return;
		detailTogglePointer.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		const finalOffset = Math.min(
			52,
			Math.max(0, detailToggleDragStart.current.offset + event.clientX - detailToggleDragStart.current.x),
		);
		if (detailToggleMoved.current) {
			setContentMode(finalOffset >= 26 ? "preview" : "edit");
		}
		setDetailToggleDrag(null);
	};

	useEffect(() => {
		if (!open) return;
		const current = form.getFieldValue("theme");
		if (!current && themes.length > 0) {
			form.setFieldValue("theme", themes[0].value);
		}
		if (!form.getFieldValue("time")) {
			const start = dayjs().minute(0).second(0).millisecond(0);
			form.setFieldValue("time", [start, start]);
		}
	}, [form, open, themes]);

	const close = () => {
		form.resetFields();
		setCreationMode("quick");
		setContentMode("edit");
		setAddingTheme(false);
		onCancel();
	};

	const addTheme = () => {
		if (addingTheme) return;
		const label = themeName.trim();
		if (!label) return message.warning(t("sys.record.form.themeNameRequired"));
		const theme = {
			value: `custom_${Date.now().toString(36)}`,
			label,
			color: themeColor,
			custom: true,
		};
		Promise.resolve(onAddTheme(theme))
			.then((createdTheme) => {
				form.setFieldValue("theme", createdTheme?.value ?? theme.value);
				setThemeName("");
				setAddingTheme(false);
			})
			.catch(() => {
				// handled by caller
			});
	};

	return (
		<RecordModal
			title={t("sys.record.form.title", { date: date.format("YYYY-MM-DD") })}
			open={open}
			centered
			onCancel={close}
			footer={
				<Flex justify="flex-end" gap={8}>
					<Button type="button" variant="outline" onClick={close}>
						{t("sys.record.form.cancel")}
					</Button>
					<Button type="button" onClick={() => form.submit()}>
						{creationMode === "quick" ? t("sys.record.form.quickSave") : t("sys.record.form.save")}
					</Button>
				</Flex>
			}
			width={creationMode === "quick" ? 520 : 600}
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
				className="record-form"
				form={form}
				layout="vertical"
				initialValues={{ theme: themes[0]?.value }}
				preserve
				onFinish={async (values) => {
					try {
						await onCreate({
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
						setAddingTheme(false);
					} catch {
						// handled by caller
					}
				}}
			>
				<Form.Item
					name="title"
					label={t("sys.record.form.recordTitle")}
					rules={[{ required: true, whitespace: true, message: t("sys.record.form.recordTitleRequired") }]}
				>
					<Input autoFocus maxLength={80} showCount placeholder={t("sys.record.form.recordTitlePlaceholder")} />
				</Form.Item>
				{creationMode === "quick" && hasThemeOptions && (
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
						{hasThemeOptions && (
							<Form.Item
								label={
									<Flex align="center" gap={8}>
										<span>{t("sys.record.form.theme")}</span>
						<Button
							type="button"
							variant="link"
							size="sm"
							onClick={() => setAddingTheme((value) => !value)}
						>
							<Icon icon="solar:add-circle-linear" size={16} />
											{t("sys.record.form.newTheme")}
										</Button>
									</Flex>
								}
							>
								<Form.Item name="theme" noStyle>
									<ThemeGroup>
										{themes.map((theme) => (
											<ThemeChoice
												key={theme.value}
												style={{ "--record-theme-color": theme.color } as CSSProperties}
											>
												<Radio.Button value={theme.value}>
													<ThemeDot $color={theme.color} />
													{getRecordThemeLabel(theme, t)}
												</Radio.Button>
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
										<Button type="button" variant="outline" onClick={addTheme}>{t("sys.record.form.add")}</Button>
									</Flex>
								)}
							</Form.Item>
						)}
						<Form.Item name="time" label={t("sys.record.form.time")}>
							<GuidedTimeRangePicker />
						</Form.Item>
						<Form.Item
							label={
								<Flex justify="space-between" align="center" style={{ width: "100%" }}>
									<span>{t("sys.record.form.details")}</span>
									<DetailModeToggle
										role="group"
										aria-label={t("sys.record.form.details")}
										onPointerDown={startDetailToggleDrag}
										onPointerMove={moveDetailToggleDrag}
										onPointerUp={endDetailToggleDrag}
										onPointerCancel={endDetailToggleDrag}
										onClick={(event) => {
											if (detailToggleMoved.current) {
												detailToggleMoved.current = false;
												return;
											}
											if (event.detail === 0) return;
											const bounds = event.currentTarget.getBoundingClientRect();
											setContentMode(event.clientX - bounds.left >= bounds.width / 2 ? "preview" : "edit");
										}}
									>
										<DetailModeThumb
											$offset={detailToggleDrag ?? (contentMode === "preview" ? 52 : 0)}
											$dragging={detailToggleDrag !== null}
										/>
										<DetailModeOption
											type="button"
											$active={contentMode === "edit"}
											aria-pressed={contentMode === "edit"}
											onClick={() => {
												if (!detailToggleMoved.current) setContentMode("edit");
											}}
										>
											{t("sys.record.form.edit")}
										</DetailModeOption>
										<DetailModeOption
											type="button"
											$active={contentMode === "preview"}
											aria-pressed={contentMode === "preview"}
											onClick={() => {
												if (!detailToggleMoved.current) setContentMode("preview");
											}}
										>
											{t("sys.record.form.preview")}
										</DetailModeOption>
									</DetailModeToggle>
								</Flex>
							}
						>
							<Form.Item name="description" noStyle>
								<Input.TextArea
									style={{ display: contentMode === "edit" ? "block" : "none" }}
									rows={2}
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
								<ImportTitleRow>
									<Typography.Text strong>{t("sys.record.form.importTitle")}</Typography.Text>
									<Tooltip
										placement="top"
										overlayStyle={{ maxWidth: 440 }}
										title={
											<ImportFormatHint>
												<strong>{t("sys.record.form.importFormatTitle")}</strong>
												<pre>{`{
  "records": [
    {
      "recordDate": "2026-08-21",
      "title": "完成项目周报",
      "themeId": 1,
      "startTime": "09:00",
      "endTime": "10:00",
      "contentMd": "支持 Markdown"
    }
  ]
}`}</pre>
												<span>{t("sys.record.form.importFormatNote")}</span>
											</ImportFormatHint>
										}
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="size-6 text-muted-foreground"
											aria-label={t("sys.record.form.importFormatTitle")}
										>
											<Icon icon="solar:info-circle-linear" size={17} />
										</Button>
									</Tooltip>
								</ImportTitleRow>
								<br />
								<Typography.Text type="secondary">{t("sys.record.form.importHint")}</Typography.Text>
							</div>
							<Upload accept="application/json,.json" showUploadList={false} beforeUpload={onImport}>
								<Button type="button" variant="outline">
									<Icon icon="solar:import-bold-duotone" size={18} />
									{t("sys.record.form.uploadJson")}
								</Button>
							</Upload>
						</UploadArea>
					</>
				)}
			</Form>
		</RecordModal>
	);
}

const RecordModal = styled(Modal)`
	.record-form .ant-form-item-label > label {
		width: 100%;
	}
`;
const ImportTitleRow = styled.div`display: inline-flex; align-items: center; gap: 3px;`;
const ImportFormatHint = styled.div`display: flex; width: 390px; max-width: calc(100vw - 64px); flex-direction: column; gap: 8px; font-size: 12px; line-height: 1.5; pre { max-height: 280px; margin: 0; padding: 10px; overflow: auto; border-radius: 6px; color: rgb(255 255 255 / 92%); font: 11px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; background: rgb(0 0 0 / 24%); white-space: pre; } span { color: rgb(255 255 255 / 75%); }`;

const DetailModeToggle = styled.div`
	position: relative;
	display: grid;
	grid-template-columns: repeat(2, 52px);
	height: 30px;
	padding: 2px;
	border: 1px solid #d9d9d9;
	border-radius: 8px;
	background: #f5f5f5;
	touch-action: none;
	user-select: none;
`;

const DetailModeThumb = styled.span<{ $offset: number; $dragging: boolean }>`
	position: absolute;
	top: 2px;
	left: 2px;
	width: 52px;
	height: 24px;
	border-radius: 6px;
	background: ${themeVars.colors.palette.primary.default};
	box-shadow: 0 1px 3px rgb(0 0 0 / 18%);
	transform: translateX(${({ $offset }) => `${$offset}px`});
	transition: ${({ $dragging }) => ($dragging ? "none" : "transform 160ms ease")};
`;

const DetailModeOption = styled(Button)<{ $active: boolean }>`
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 24px;
	padding: 0;
	border: 0;
	border-radius: 6px;
	color: ${({ $active }) => ($active ? "#fff" : "#595959")};
	font: inherit;
	font-size: 13px;
	font-weight: 500;
	line-height: 1;
	background: transparent;
	box-shadow: none;
	cursor: pointer;
	transition: color 160ms ease;

	&:focus-visible {
		outline: 2px solid ${themeVars.colors.palette.primary.default};
		outline-offset: 1px;
	}
`;

const CreationSwitch = styled(
	Segmented,
)`margin-bottom: 20px; padding: 4px; background: color-mix(in srgb, ${themeVars.colors.palette.primary.default} 10%, transparent); .ant-segmented-thumb, .ant-segmented-item-selected { color: white !important; background: ${themeVars.colors.palette.primary.default} !important; box-shadow: 0 2px 8px color-mix(in srgb, ${themeVars.colors.palette.primary.default} 28%, transparent) !important; } .ant-segmented-item-selected .ant-segmented-item-label { color: white !important; font-weight: 600; }`;
const ThemeGroup = styled(
	Radio.Group,
)`display: flex; flex-wrap: wrap; gap: 12px; .ant-radio-button-wrapper { display: inline-flex; align-items: center; gap: 7px; height: 36px; margin: 0 !important; color: var(--record-theme-color); border: 1px solid color-mix(in srgb, var(--record-theme-color) 42%, white); border-inline-start-width: 1px !important; border-radius: 8px !important; background: color-mix(in srgb, var(--record-theme-color) 12%, white); transition: color 160ms ease, border-color 160ms ease, background 160ms ease; } .ant-radio-button-wrapper:hover, .ant-radio-button-wrapper-checked { color: white !important; border-color: var(--record-theme-color) !important; background: var(--record-theme-color) !important; box-shadow: none !important; } .ant-radio-button-wrapper::before { display: none !important; }`;
const ThemeChoice = styled.span`position: relative; display: inline-flex; margin: 0 4px 6px 0; &:hover > .ant-btn { color: white; }`;
const ThemeDot = styled.span<{
	$color: string;
}>`width: 9px; height: 9px; flex: none; border-radius: 50%; background: ${({ $color }) => $color};`;
const ThemeSelectLabel = styled.span`display: inline-flex; align-items: center; gap: 8px;`;
const Preview = styled.div`min-height: 210px; padding: 12px; border: 1px solid #d9d9d9; border-radius: 8px;`;
const UploadArea = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border: 1px dashed #d9d9d9; border-radius: 10px;`;
