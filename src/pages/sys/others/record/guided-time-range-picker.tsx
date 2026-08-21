import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Popover } from "antd";
import { Icon } from "@/components/icon";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";

type TimeRange = [Dayjs, Dayjs];
type Endpoint = 0 | 1;
type Unit = "hour" | "minute";

interface Props {
	value?: TimeRange;
	onChange?: (value: TimeRange) => void;
}

const currentDefaultRange = (): TimeRange => {
	const start = dayjs().minute(0).second(0).millisecond(0);
	return [start, start];
};

const wrap = (value: number, size: number) => (value + size) % size;

export function GuidedTimeRangePicker({ value, onChange }: Props) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<TimeRange>(() => value ?? currentDefaultRange());
	const dragRef = useRef({ pointerId: -1, y: 0, endpoint: 0 as Endpoint, unit: "hour" as Unit });

	useEffect(() => {
		if (value) setDraft(value);
	}, [value]);

	const move = (endpoint: Endpoint, unit: Unit, direction: number) => {
		setDraft((previous) => {
			const updated = [...previous] as TimeRange;
			if (unit === "hour") {
				updated[endpoint] = updated[endpoint].hour(wrap(updated[endpoint].hour() + direction, 24));
			} else {
				const minuteIndex = Math.round(updated[endpoint].minute() / 5);
				updated[endpoint] = updated[endpoint].minute(wrap(minuteIndex + direction, 12) * 5);
			}
			return updated;
		});
	};

	const pointerDown = (endpoint: Endpoint, unit: Unit) => (event: PointerEvent<HTMLButtonElement>) => {
		dragRef.current = { pointerId: event.pointerId, y: event.clientY, endpoint, unit };
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
		if (dragRef.current.pointerId !== event.pointerId) return;
		const distance = dragRef.current.y - event.clientY;
		if (Math.abs(distance) < 22) return;
		move(dragRef.current.endpoint, dragRef.current.unit, distance > 0 ? 1 : -1);
		dragRef.current.y = event.clientY;
	};

	const pointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
		if (dragRef.current.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		dragRef.current.pointerId = -1;
	};

	const part = (endpoint: Endpoint, unit: Unit) => {
		const rawValue = unit === "hour" ? draft[endpoint].hour() : wrap(Math.round(draft[endpoint].minute() / 5), 12) * 5;
		const onWheel = (event: WheelEvent<HTMLButtonElement>) => {
			event.preventDefault();
			move(endpoint, unit, event.deltaY > 0 ? 1 : -1);
		};
		const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
			if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
			event.preventDefault();
			move(endpoint, unit, event.key === "ArrowUp" ? -1 : 1);
		};
		return (
			<TimePart
				type="button"
				aria-label={t(unit === "hour" ? "sys.record.form.hour" : "sys.record.form.minute")}
				onWheel={onWheel}
				onKeyDown={onKeyDown}
				onPointerDown={pointerDown(endpoint, unit)}
				onPointerMove={pointerMove}
				onPointerUp={pointerEnd}
				onPointerCancel={pointerEnd}
			>
				<span>{String(rawValue).padStart(2, "0")}</span>
				<small>{t(unit === "hour" ? "sys.record.form.hour" : "sys.record.form.minute")}</small>
			</TimePart>
		);
	};

	const timeField = (endpoint: Endpoint) => (
		<TimeField>
			{part(endpoint, "hour")}
			<TimeSeparator>:</TimeSeparator>
			{part(endpoint, "minute")}
		</TimeField>
	);

	const content = (
		<PickerPanel>
			<TimeGroups>
				<TimeGroup><TimeLabel>{t("sys.record.form.startTime")}</TimeLabel>{timeField(0)}</TimeGroup>
				<TimeGroup><TimeLabel>{t("sys.record.form.endTime")}</TimeLabel>{timeField(1)}</TimeGroup>
			</TimeGroups>
			<GestureHint>{t("sys.record.form.timeGestureHint")}</GestureHint>
			<PanelActions>
				<Button
					type="button"
					onClick={() => {
						onChange?.(draft);
						setOpen(false);
					}}
				>
					{t("sys.record.form.timeConfirm")}
				</Button>
			</PanelActions>
		</PickerPanel>
	);

	const openPicker = () => {
		setDraft(value ?? currentDefaultRange());
		setOpen(true);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => nextOpen ? openPicker() : setOpen(false)}
			content={content}
			trigger="click"
			placement="bottomLeft"
			autoAdjustOverflow
			getPopupContainer={(triggerNode) =>
				(triggerNode.closest(".ant-modal-content") as HTMLElement | null) ?? triggerNode.parentElement ?? document.body
			}
		>
			<TriggerButton type="button" variant="outline">
				<Icon icon="solar:clock-circle-linear" size={18} />
				<span>{(value ?? draft)[0].format("HH:mm")}</span><TimeDash>—</TimeDash><span>{(value ?? draft)[1].format("HH:mm")}</span>
			</TriggerButton>
		</Popover>
	);
}

const TriggerButton = styled(Button)`width: 100%; height: 40px; justify-content: flex-start; font-weight: 400;`;
const TimeDash = styled.span`color: ${themeVars.colors.text.secondary};`;
const PickerPanel = styled.div`box-sizing: border-box; width: min(400px, calc(100vw - 64px)); max-width: 100%; padding: 10px 8px 5px; user-select: none;`;
const TimeGroups = styled.div`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;`;
const TimeGroup = styled.div`min-width: 0;`;
const TimeLabel = styled.div`margin: 0 0 5px 2px; color: ${themeVars.colors.text.primary}; font-size: 14px; font-weight: 600;`;
const TimeField = styled.div`display: grid; grid-template-columns: 1fr 14px 1fr; align-items: center; height: 52px; padding: 3px 5px; border: 1px solid color-mix(in srgb, ${themeVars.colors.text.secondary} 27%, transparent); border-radius: 10px; background: ${themeVars.colors.background.paper}; transition: 150ms ease; &:focus-within { border-color: ${themeVars.colors.palette.primary.default}; box-shadow: 0 0 0 2px color-mix(in srgb, ${themeVars.colors.palette.primary.default} 11%, transparent); }`;
const TimePart = styled.button`position: relative; display: flex; height: 44px; align-items: baseline; justify-content: center; gap: 3px; padding: 10px 2px 0; overflow: hidden; color: ${themeVars.colors.text.secondary}; border: 0; border-radius: 7px; background: transparent; font: inherit; cursor: ns-resize; touch-action: none; transition: 140ms ease; &::before, &::after { position: absolute; right: 0; left: 0; height: 8px; content: ""; pointer-events: none; } &::before { top: 0; background: linear-gradient(${themeVars.colors.background.paper}, transparent); } &::after { bottom: 0; background: linear-gradient(transparent, ${themeVars.colors.background.paper}); } &:hover, &:focus-visible, &:active { color: ${themeVars.colors.palette.primary.default}; outline: 0; background: color-mix(in srgb, ${themeVars.colors.palette.primary.default} 9%, transparent); } span { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; } small { font-size: 9px; font-weight: 600; }`;
const TimeSeparator = styled.span`color: ${themeVars.colors.text.secondary}; font-size: 20px; text-align: center;`;
const GestureHint = styled.div`margin-top: 9px; color: ${themeVars.colors.text.secondary}; font-size: 11px; text-align: center;`;
const PanelActions = styled.div`display: flex; justify-content: flex-end; margin-top: 8px; button { min-width: 88px; }`;
