import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/ui/sheet";
export function useLabels() {
	const { t } = useTranslation();
	return (key: string) => t(`search.${key}`);
}
export function SearchSheet({
	title,
	children,
	close,
}: {
	title: string;
	children: React.ReactNode;
	close: () => void;
}) {
	const mobile = useMediaQuery({ maxWidth: 767 });
	return (
		<Sheet open onOpenChange={(open) => !open && close()}>
			<SheetContent
				side={mobile ? "bottom" : "right"}
				className="search-sheet w-full sm:max-w-lg overflow-y-auto max-h-[92dvh] md:max-h-none p-5"
				aria-describedby={undefined}
			>
				<SheetHeader className="p-0 pr-8">
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription className="sr-only">{title}</SheetDescription>
				</SheetHeader>
				{children}
			</SheetContent>
		</Sheet>
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
		<span className={className} aria-label={alt}>
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
