import { useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import userBrowsingHistoryService from "@/api/services/userBrowsingHistoryService";
import { useUserToken } from "@/store/userStore";

type UADataBrand = {
	brand: string;
	version: string;
};

type NavigatorWithUAData = Navigator & {
	userAgentData?: {
		brands?: UADataBrand[];
		platform?: string;
	};
};

const getBrowserLabel = (navigatorObject: NavigatorWithUAData) => {
	const brands = navigatorObject.userAgentData?.brands ?? [];
	const matchedBrand = brands.find((brand) => !/not/i.test(brand.brand));

	if (matchedBrand) {
		return `${matchedBrand.brand} ${matchedBrand.version}`;
	}

	const userAgent = navigatorObject.userAgent;
	const browserMatchers = [
		{ name: "Microsoft Edge", pattern: /Edg\/(\d+)/ },
		{ name: "Chrome", pattern: /Chrome\/(\d+)/ },
		{ name: "Firefox", pattern: /Firefox\/(\d+)/ },
		{ name: "Safari", pattern: /Version\/(\d+).+Safari/ },
	];

	for (const matcher of browserMatchers) {
		const matchResult = userAgent.match(matcher.pattern);
		if (matchResult?.[1]) {
			return `${matcher.name} ${matchResult[1]}`;
		}
	}

	return "Unknown Browser";
};

const getPlatformLabel = (navigatorObject: NavigatorWithUAData) => {
	const userAgent = navigatorObject.userAgent;

	if (navigatorObject.userAgentData?.platform) {
		return navigatorObject.userAgentData.platform;
	}
	if (/Windows/i.test(userAgent)) {
		return "Windows";
	}
	if (/Mac OS X/i.test(userAgent)) {
		return "macOS";
	}
	if (/Android/i.test(userAgent)) {
		return "Android";
	}
	if (/iPhone|iPad|iPod/i.test(userAgent)) {
		return "iOS";
	}
	if (/Linux/i.test(userAgent)) {
		return "Linux";
	}

	return "Unknown OS";
};

const UserBrowsingTracker = () => {
	const { pathname } = useLocation();
	const { accessToken } = useUserToken();

	const device = useMemo(() => {
		if (typeof navigator === "undefined") {
			return "Unknown Browser / Unknown OS";
		}

		const navigatorObject = navigator as NavigatorWithUAData;
		const browser = getBrowserLabel(navigatorObject);
		const platform = getPlatformLabel(navigatorObject);

		return `${browser} / ${platform}`;
	}, []);

	useEffect(() => {
		if (!accessToken) {
			return;
		}

		void userBrowsingHistoryService.create({ pageUrl: pathname, device });
	}, [accessToken, pathname, device]);

	return null;
};

export default UserBrowsingTracker;

