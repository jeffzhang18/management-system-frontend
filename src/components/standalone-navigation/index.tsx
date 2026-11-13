import { useEffect } from "react";
import { standaloneDestination } from "./navigation";

/** Keep internal new-window links inside an installed Home Screen web app. */
export default function StandaloneNavigation() {
	useEffect(() => {
		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (!standalone) return;

		const onClick = (event: MouseEvent) => {
			const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
			if (!anchor) return;
			const destination = standaloneDestination(
				{ href: anchor.href, target: anchor.target, download: anchor.hasAttribute("download") },
				event,
				window.location.href,
			);
			if (!destination) return;
			event.preventDefault();
			window.location.assign(destination);
		};
		document.addEventListener("click", onClick);
		return () => document.removeEventListener("click", onClick);
	}, []);

	return null;
}
