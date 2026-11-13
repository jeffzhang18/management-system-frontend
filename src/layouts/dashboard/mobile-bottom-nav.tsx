import { GlassNav } from "@zakisheriff/liquid-glass";
import { CloudSun, CreditCard, NotebookPen, Search } from "lucide-react";
import { startTransition } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { useMediaQuery } from "@/hooks/use-media-query";
import "./mobile-bottom-nav.css";
import "@zakisheriff/liquid-glass/styles.css";
import { mobileNavIndex, mobileNavRoutes } from "./mobile-nav-routes";

const icons = [Search, CloudSun, NotebookPen, CreditCard];

export function MobileBottomNav() {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const mobile = useMediaQuery({ maxWidth: 767 });
	const reducedMotion = useMediaQuery({ prefersReducedMotion: true });
	const activeIndex = mobileNavIndex(pathname);
	if (!mobile || activeIndex < 0) return null;

	return (
		<div className="dashboard-mobile-nav">
			<GlassNav
				aria-label={t("sys.nav.mobileNavigation")}
				intensity={reducedMotion ? 1 : 2}
				activeIndex={activeIndex}
				onChange={(index) => {
					const item = mobileNavRoutes[index];
					if (!item || index === activeIndex) return;
					startTransition(() => navigate(item.path));
				}}
				items={mobileNavRoutes.map((item, index) => {
					const Icon = icons[index];
					return { label: t(`sys.nav.${item.label}`), icon: <Icon aria-hidden="true" /> };
				})}
			/>
		</div>
	);
}
