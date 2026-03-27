import { ThemeLayout } from "#/enum";
import Logo from "@/components/logo";
import { down, useMediaQuery } from "@/hooks";
import { useSettings } from "@/store/settingStore";
import Header from "./header";
import Main from "./main";
import { NavHorizontalLayout, NavMobileLayout, NavVerticalLayout, useFilteredNavData } from "./nav";

export default function DashboardLayout() {
	const isMobile = useMediaQuery(down("md"));
	const { themeLayout } = useSettings();
	const navData = useFilteredNavData();
	const isHorizontal = !isMobile && themeLayout === ThemeLayout.Horizontal;
	const isVertical = !isMobile && !isHorizontal;

	const contentPaddingLeft = isVertical
		? themeLayout === ThemeLayout.Vertical
			? "var(--layout-nav-width)"
			: "var(--layout-nav-width-mini)"
		: 0;

	return (
		<div data-slot="slash-layout-root" className="w-full min-h-screen bg-background">
			{isVertical && <NavVerticalLayout data={navData} />}

			<div
				className="relative w-full min-h-screen flex flex-col transition-[padding] duration-300 ease-in-out"
				style={{ paddingLeft: contentPaddingLeft }}
			>
				<Header leftSlot={isMobile ? <NavMobileLayout data={navData} /> : isHorizontal ? <Logo /> : undefined} />

				{isHorizontal && <NavHorizontalLayout data={navData} />}

				<Main />
			</div>
		</div>
	);
}
