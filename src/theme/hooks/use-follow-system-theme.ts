import { useEffect, useRef } from "react";
import { ThemeMode } from "#/enum";
import { useSettingActions, useSettings } from "@/store/settingStore";

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

export const getSystemThemeMode = (): ThemeMode =>
	window.matchMedia(SYSTEM_DARK_QUERY).matches ? ThemeMode.Dark : ThemeMode.Light;

/**
 * While `themeFollowSystem` is on, keeps `themeMode` equal to the OS color scheme,
 * both now and whenever the system switches between light and dark.
 */
export function useFollowSystemTheme() {
	const settings = useSettings();
	const { setSettings } = useSettingActions();
	const latest = useRef(settings);
	latest.current = settings;

	const followSystem = Boolean(settings.themeFollowSystem);
	const { themeMode } = settings;

	// biome-ignore lint/correctness/useExhaustiveDependencies: themeMode re-runs the check when a synced value overrides it
	useEffect(() => {
		if (!followSystem) return;

		const query = window.matchMedia(SYSTEM_DARK_QUERY);
		const applySystemMode = () => {
			const systemMode = query.matches ? ThemeMode.Dark : ThemeMode.Light;
			if (latest.current.themeMode !== systemMode) {
				setSettings({ ...latest.current, themeMode: systemMode });
			}
		};

		applySystemMode();
		query.addEventListener("change", applySystemMode);
		return () => query.removeEventListener("change", applySystemMode);
	}, [followSystem, themeMode, setSettings]);
}
