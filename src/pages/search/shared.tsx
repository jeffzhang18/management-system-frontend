import { GlassSlider } from "@zakisheriff/liquid-glass";
import { type ComponentProps, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import baiduIcon from "@/assets/search-engines/baidu.svg";
import bingIcon from "@/assets/search-engines/bing.svg";
import googleIcon from "@/assets/search-engines/google.svg";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ui/sheet";
import { GlassPanel } from "../subscriptions/glass";
export function useLabels() {
	const { t } = useTranslation();
	return (key: string) => t(`search.${key}`);
}

/** Explicit keyboard handling also works when the library captures pointer input. */
export function SearchSlider(props: ComponentProps<typeof GlassSlider>) {
	return (
		<GlassSlider
			tint="var(--primary)"
			{...props}
			onKeyDown={(event) => {
				const { min = 0, max = 100, value = 0, step = 1, onChange } = props;
				const increment = Number(step) || 1;
				const values: Record<string, number> = {
					Home: min,
					End: max,
					ArrowRight: value + increment,
					ArrowUp: value + increment,
					ArrowLeft: value - increment,
					ArrowDown: value - increment,
					PageUp: value + increment * 10,
					PageDown: value - increment * 10,
				};
				const next = values[event.key];
				if (next === undefined) return;
				event.preventDefault();
				event.currentTarget.closest(".lg-slider")?.setAttribute("data-keyboard", "");
				onChange?.(Number(Math.min(max, Math.max(min, next)).toFixed(10)));
			}}
		/>
	);
}
export function SearchSheet({
	title,
	children,
	close,
	footer,
}: {
	title: string;
	children: React.ReactNode;
	close: () => void;
	footer?: React.ReactNode;
}) {
	const mobile = useMediaQuery({ maxWidth: 767 });
	const [viewport, setViewport] = useState<{ height: number; bottom: number }>();
	useEffect(() => {
		const visual = window.visualViewport;
		if (!mobile || !visual) return;
		const update = () =>
			setViewport({
				height: Math.min(visual.height * 0.9, 860),
				bottom: Math.max(0, window.innerHeight - visual.height - visual.offsetTop),
			});
		update();
		visual.addEventListener("resize", update);
		visual.addEventListener("scroll", update);
		return () => {
			visual.removeEventListener("resize", update);
			visual.removeEventListener("scroll", update);
		};
	}, [mobile]);
	return (
		<Sheet open onOpenChange={(open) => !open && close()}>
			<SheetContent
				side={mobile ? "bottom" : "right"}
				className="search-sheet"
				aria-describedby={undefined}
				style={
					mobile && viewport
						? { height: viewport.height, maxHeight: viewport.height, bottom: viewport.bottom }
						: undefined
				}
			>
				<GlassPanel className="search-sheet-material" padding="0" radius="28px">
					<SheetHeader className="search-sheet-header">
						<SheetTitle>{title}</SheetTitle>
						<SheetDescription className="sr-only">{title}</SheetDescription>
					</SheetHeader>
					<div className="search-sheet-body">{children}</div>
					{footer && <div className="search-footer">{footer}</div>}
				</GlassPanel>
			</SheetContent>
		</Sheet>
	);
}

export function SearchSelect<T extends string>({
	label,
	value,
	onChange,
	options,
	disabled,
	className = "",
	menuClassName = "",
}: {
	label: string;
	value: T;
	onChange: (value: T) => void;
	options: { value: T; label: string; icon?: string }[];
	disabled?: boolean;
	className?: string;
	menuClassName?: string;
}) {
	return (
		<Select value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
			<SelectTrigger aria-label={label} className={`search-select-trigger ${className}`}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent className={`search-select-menu ${menuClassName}`} sideOffset={6}>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value} textValue={option.label}>
						{option.icon ? (
							<span className="search-engine-option">
								<img src={option.icon} alt="" aria-hidden="true" className="search-engine-icon" />
								<span className="search-engine-name">{option.label}</span>
							</span>
						) : (
							option.label
						)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function EngineSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: import("@/api/services/searchService").Engine;
	onChange: (value: import("@/api/services/searchService").Engine) => void;
	disabled?: boolean;
	className?: string;
}) {
	const l = useLabels();
	return (
		<SearchSelect
			label={l("engine")}
			value={value}
			onChange={onChange}
			disabled={disabled}
			className={className}
			menuClassName="search-engine-menu"
			options={[
				{ value: "google", label: "Google", icon: googleIcon },
				{ value: "baidu", label: l("baidu"), icon: baiduIcon },
				{ value: "bing", label: "Bing", icon: bingIcon },
			]}
		/>
	);
}
export function OnlineImage({
	url,
	alt,
	className,
	onResult,
}: {
	url: string;
	alt: string;
	className?: string;
	onResult?: (success: boolean) => void;
}) {
	const [failed, setFailed] = useState(false);
	return failed ? (
		<span role="img" className={className} aria-label={alt}>
			{alt.slice(0, 1).toUpperCase()}
		</span>
	) : (
		<img
			src={url}
			alt={alt}
			className={className}
			referrerPolicy="no-referrer"
			onLoad={() => onResult?.(true)}
			onError={() => {
				setFailed(true);
				onResult?.(false);
			}}
		/>
	);
}
