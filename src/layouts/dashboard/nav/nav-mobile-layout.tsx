import { Icon } from "@/components/icon";
import Logo from "@/components/logo";
import { NavVertical } from "@/components/nav";
import type { NavProps } from "@/components/nav/types";
import { GLOBAL_CONFIG } from "@/global-config";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/ui/sheet";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

export function NavMobileLayout({ data }: NavProps) {
	const [open, setOpen] = useState(false);
	const location = useLocation();

	useEffect(() => {
		setOpen(false);
	}, [location.pathname]);

	return (
		<Sheet open={open} onOpenChange={setOpen} modal={false}>
			<SheetTrigger asChild>
				<Button type="button" variant="ghost" size="icon">
					<Icon icon="local:ic-menu" size={24} />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="[&>button]:hidden px-2 w-[280px]">
				<div className="flex h-[var(--layout-header-height)] items-center justify-between px-2">
					<div className="flex items-center gap-2">
						<Logo />
						<span className="text-xl font-bold">{GLOBAL_CONFIG.appName}</span>
					</div>
					<Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close sidebar">
						<Icon icon="eva:arrow-ios-forward-fill" size={20} />
					</Button>
				</div>
				<ScrollArea className="h-full">
					<NavVertical data={data} />
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}
