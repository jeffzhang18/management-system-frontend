export const mobileNavRoutes = [
	{ path: "/search", label: "searchTab", page: "/pages/search" },
	{ path: "/weather", label: "weather", page: "/pages/dashboard/weather" },
	{ path: "/record", label: "record", page: "/pages/sys/others/record" },
	{ path: "/subscriptions", label: "subscriptionsTab", page: "/pages/subscriptions" },
] as const;

export function mobileNavIndex(pathname: string) {
	return mobileNavRoutes.findIndex(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
}
