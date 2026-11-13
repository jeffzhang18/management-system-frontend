import { useEffect, useRef } from "react";
import uiSettingsService, { type UiSettingsPayload } from "@/api/services/uiSettingsService";
import { useSettingActions, useSettings } from "@/store/settingStore";
import { useUserInfo } from "@/store/userStore";

const KEYS = [
	"themeColorPresets",
	"themeMode",
	"themeLayout",
	"themeStretch",
	"breadCrumb",
	"accordion",
	"multiTab",
	"darkSidebar",
	"fontFamily",
	"fontSize",
	"direction",
] as const;

const pick = (source: Record<string, unknown>): UiSettingsPayload => {
	const out: Record<string, unknown> = {};
	for (const key of KEYS) if (source[key] !== undefined) out[key] = source[key];
	return out as UiSettingsPayload;
};

/**
 * Keeps the settings drawer values in the backend per account.
 * The server copy wins on login; an account without one is seeded from local values.
 * localStorage stays as an instant cache and offline fallback.
 */
export function useSettingsSync() {
	const settings = useSettings();
	const { setSettings } = useSettingActions();
	const userId = useUserInfo().id;
	const latest = useRef(settings);
	const synced = useRef("");
	const ready = useRef(false);
	latest.current = settings;

	useEffect(() => {
		if (!userId) return;
		let cancelled = false;
		ready.current = false;
		uiSettingsService
			.get()
			.then(async ({ settings: remote }) => {
				if (cancelled) return;
				if (remote && Object.keys(remote).length > 0) {
					const merged = { ...latest.current, ...pick(remote) };
					synced.current = JSON.stringify(pick(merged));
					setSettings(merged);
				} else {
					const local = pick(latest.current);
					synced.current = JSON.stringify(local);
					await uiSettingsService.save(local);
				}
				if (!cancelled) ready.current = true;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			ready.current = false;
		};
	}, [userId, setSettings]);

	useEffect(() => {
		if (!userId || !ready.current) return;
		const body = pick(settings);
		const serialized = JSON.stringify(body);
		if (serialized === synced.current) return;
		const timer = window.setTimeout(() => {
			uiSettingsService
				.save(body)
				.then(() => {
					synced.current = serialized;
				})
				.catch(() => {});
		}, 600);
		return () => window.clearTimeout(timer);
	}, [settings, userId]);
}
