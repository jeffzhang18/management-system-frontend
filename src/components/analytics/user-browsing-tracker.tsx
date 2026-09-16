import { useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import userBrowsingHistoryService, {
	type BrowsingHistoryEventType,
	type BrowsingHistoryLeaveReason,
} from "@/api/services/userBrowsingHistoryService";
import userStore, { useUserToken } from "@/store/userStore";
import { ActiveTimeTracker, DEFAULT_IDLE_TIMEOUT_MS } from "./active-time-tracker";

const HEARTBEAT_INTERVAL_MS = 30_000;
let activeLogoutHandler: (() => void) | null = null;

export const reportActivePageLeaveForLogout = () => activeLogoutHandler?.();

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

	if (matchedBrand) return `${matchedBrand.brand} ${matchedBrand.version}`;

	const userAgent = navigatorObject.userAgent;
	const browserMatchers = [
		{ name: "Microsoft Edge", pattern: /Edg\/(\d+)/ },
		{ name: "Chrome", pattern: /Chrome\/(\d+)/ },
		{ name: "Firefox", pattern: /Firefox\/(\d+)/ },
		{ name: "Safari", pattern: /Version\/(\d+).+Safari/ },
	];

	for (const matcher of browserMatchers) {
		const matchResult = userAgent.match(matcher.pattern);
		if (matchResult?.[1]) return `${matcher.name} ${matchResult[1]}`;
	}

	return "Unknown Browser";
};

const getPlatformLabel = (navigatorObject: NavigatorWithUAData) => {
	const userAgent = navigatorObject.userAgent;

	if (navigatorObject.userAgentData?.platform) return navigatorObject.userAgentData.platform;
	if (/Windows/i.test(userAgent)) return "Windows";
	if (/Mac OS X/i.test(userAgent)) return "macOS";
	if (/Android/i.test(userAgent)) return "Android";
	if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
	if (/Linux/i.test(userAgent)) return "Linux";

	return "Unknown OS";
};

const UserBrowsingTracker = () => {
	const { pathname } = useLocation();
	const { accessToken } = useUserToken();
	const isAuthenticated = Boolean(accessToken);

	const device = useMemo(() => {
		if (typeof navigator === "undefined") return "Unknown Browser / Unknown OS";
		const navigatorObject = navigator as NavigatorWithUAData;
		return `${getBrowserLabel(navigatorObject)} / ${getPlatformLabel(navigatorObject)}`;
	}, []);

	useEffect(() => {
		const initialAccessToken = userStore.getState().userToken.accessToken;
		if (!isAuthenticated || !initialAccessToken) return;

		const pageViewId = crypto.randomUUID();
		const tracker = new ActiveTimeTracker({
			visible: document.visibilityState === "visible",
			focused: document.hasFocus(),
		});
		let sequence = 0;
		let lastReportedDuration = 0;
		let ended = false;
		let lastKnownAccessToken = initialAccessToken;
		let idleTimer: ReturnType<typeof setTimeout> | undefined;

		const unsubscribe = userStore.subscribe((state) => {
			if (state.userToken.accessToken) lastKnownAccessToken = state.userToken.accessToken;
		});

		const report = (
			eventType: BrowsingHistoryEventType,
			leaveReason?: BrowsingHistoryLeaveReason,
			keepalive = false,
		) => {
			if (ended) return;

			const activeDurationMs = tracker.getActiveDurationMs();
			if (eventType === "heartbeat" && activeDurationMs === lastReportedDuration) return;

			const reportSequence = eventType === "enter" ? sequence : ++sequence;
			if (eventType === "leave") ended = true;
			lastReportedDuration = activeDurationMs;

			void userBrowsingHistoryService
				.report(
					{
						pageViewId,
						pageUrl: pathname,
						eventType,
						sequence: reportSequence,
						activeDurationMs,
						device,
						...(leaveReason ? { leaveReason } : {}),
					},
					{ keepalive, accessToken: lastKnownAccessToken },
				)
				.catch(() => undefined);
		};

		const scheduleIdleCheck = () => {
			if (idleTimer) clearTimeout(idleTimer);
			idleTimer = setTimeout(() => tracker.getActiveDurationMs(), DEFAULT_IDLE_TIMEOUT_MS);
		};

		const handleActivity = () => {
			tracker.recordActivity();
			scheduleIdleCheck();
		};
		const handleVisibilityChange = () => {
			const visible = document.visibilityState === "visible";
			tracker.setVisible(visible);
			if (!visible) report("heartbeat", undefined, true);
		};
		const handleFocus = () => tracker.setFocused(true);
		const handleBlur = () => tracker.setFocused(false);
		const handlePageHide = (event: PageTransitionEvent) => {
			tracker.setVisible(false);
			if (event.persisted) report("heartbeat", undefined, true);
			else report("leave", "pagehide", true);
		};
		const handlePageShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return;
			tracker.setVisible(document.visibilityState === "visible");
			tracker.setFocused(document.hasFocus());
			tracker.recordActivity();
			scheduleIdleCheck();
		};
		const handleLogout = () => report("leave", "logout", true);

		activeLogoutHandler = handleLogout;
		report("enter");
		scheduleIdleCheck();
		const heartbeatTimer = window.setInterval(() => report("heartbeat"), HEARTBEAT_INTERVAL_MS);
		const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
		for (const eventName of activityEvents) {
			window.addEventListener(eventName, handleActivity, { passive: true, capture: true });
		}
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("focus", handleFocus);
		window.addEventListener("blur", handleBlur);
		window.addEventListener("pagehide", handlePageHide);
		window.addEventListener("pageshow", handlePageShow);

		return () => {
			const leaveReason: BrowsingHistoryLeaveReason = userStore.getState().userToken.accessToken
				? "route_change"
				: "logout";
			report("leave", leaveReason, true);
			if (activeLogoutHandler === handleLogout) activeLogoutHandler = null;
			unsubscribe();
			window.clearInterval(heartbeatTimer);
			if (idleTimer) clearTimeout(idleTimer);
			for (const eventName of activityEvents) {
				window.removeEventListener(eventName, handleActivity, { capture: true });
			}
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("focus", handleFocus);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("pagehide", handlePageHide);
			window.removeEventListener("pageshow", handlePageShow);
		};
	}, [device, isAuthenticated, pathname]);

	return null;
};

export default UserBrowsingTracker;
