import type { SettingsType } from "@/store/settingStore";
import apiClient from "../apiClient";

export type UiSettingsPayload = Partial<SettingsType>;

const uiSettingsService = {
	get: () => apiClient.get<{ settings: UiSettingsPayload }>({ url: "/ui-settings", suppressErrorToast: true }),
	save: (settings: UiSettingsPayload) =>
		apiClient.put<{ settings: UiSettingsPayload }>({ url: "/ui-settings", data: settings, suppressErrorToast: true }),
};

export default uiSettingsService;
