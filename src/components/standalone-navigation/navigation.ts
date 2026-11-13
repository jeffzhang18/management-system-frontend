interface LinkNavigation {
	href: string;
	target: string;
	download: boolean;
}

type NavigationClick = Pick<MouseEvent, "button" | "defaultPrevented" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">;

/** Only retarget same-origin links that would otherwise create another window. */
export function standaloneDestination(
	link: LinkNavigation,
	click: NavigationClick,
	currentHref: string,
): string | null {
	if (
		click.defaultPrevented ||
		click.button !== 0 ||
		click.metaKey ||
		click.ctrlKey ||
		click.shiftKey ||
		click.altKey ||
		link.download ||
		!link.target ||
		["_self", "_parent", "_top"].includes(link.target.toLowerCase())
	) {
		return null;
	}
	try {
		const current = new URL(currentHref);
		const destination = new URL(link.href, current);
		return /^https?:$/.test(destination.protocol) && destination.origin === current.origin ? destination.href : null;
	} catch {
		return null;
	}
}
