import "dayjs/locale/zh-cn";

import type { Locale as AntdLocal } from "antd/es/locale";
import en_US from "antd/locale/en_US";
import zh_CN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { UserInfo } from "#/entity";
import { LocalEnum, StorageEnum } from "#/enum";
import uiSettingsService from "@/api/services/uiSettingsService";
import userService from "@/api/services/userService";
import { useUserActions, useUserInfo, useUserToken } from "@/store/userStore";
import i18nInstance from "./i18n";
import { htmlLanguage, normalizeLocale } from "./locale";

dayjs.extend(updateLocale);
dayjs.updateLocale("zh-cn", { weekStart: 0 });

type Locale = keyof typeof LocalEnum;
const mapLocaleToDayjsLocale = (locale: Locale) => (locale === LocalEnum.zh_CN ? "zh-cn" : "en");
type Language = {
	locale: keyof typeof LocalEnum;
	icon: string;
	label: string;
	antdLocal: AntdLocal;
};

export const LANGUAGE_MAP: Record<Locale, Language> = {
	[LocalEnum.zh_CN]: {
		locale: LocalEnum.zh_CN,
		label: "中文",
		icon: "flag-cn",
		antdLocal: zh_CN,
	},
	[LocalEnum.en_US]: {
		locale: LocalEnum.en_US,
		label: "English",
		icon: "flag-us",
		antdLocal: en_US,
	},
};

export const isLocale = (value: unknown): value is Locale => value === LocalEnum.en_US || value === LocalEnum.zh_CN;

export const getCurrentLocale = (): Locale => {
	const current = i18nInstance.resolvedLanguage || i18nInstance.language;
	return normalizeLocale(current) || LocalEnum.en_US;
};

export const applyLocaleSetting = (nextLocale: Locale) => {
	void i18nInstance.changeLanguage(nextLocale);
	localStorage.setItem(StorageEnum.I18N, nextLocale);
	document.documentElement.lang = htmlLanguage(nextLocale);
	dayjs.locale(nextLocale === LocalEnum.zh_CN ? "zh-cn" : "en");
};

export default function useLocale() {
	const { t, i18n } = useTranslation();
	const { accessToken } = useUserToken();
	const userInfo = useUserInfo();
	const { setUserInfo } = useUserActions();

	const locale = normalizeLocale(i18n.resolvedLanguage || i18n.language) || LocalEnum.en_US;
	const language = LANGUAGE_MAP[locale];

	const applyLocale = useCallback(
		(nextLocale: Locale) => {
			void i18n.changeLanguage(nextLocale);
			localStorage.setItem(StorageEnum.I18N, nextLocale);
			document.documentElement.lang = htmlLanguage(nextLocale);
			dayjs.locale(mapLocaleToDayjsLocale(nextLocale));
		},
		[i18n],
	);

	useEffect(() => {
		dayjs.locale(mapLocaleToDayjsLocale(locale));
	}, [locale]);

	const mapLocaleToApiLanguage = (nextLocale: Locale) => {
		return nextLocale === LocalEnum.zh_CN ? "zh-CN" : "en-US";
	};

	/**
	 * localstorage -> i18nextLng change
	 */
	const setLocale = async (nextLocale: Locale) => {
		applyLocale(nextLocale);
		// Guest preferences stay local; protected settings APIs require a session.
		if (!accessToken) return;
		void uiSettingsService.save({ language: nextLocale }).catch(() => {});

		const languageValue = mapLocaleToApiLanguage(nextLocale);
		try {
			const profile = await userService.updateProfile({ language: languageValue });
			setUserInfo({
				...userInfo,
				...profile,
				language: profile?.language ?? languageValue,
			} as UserInfo);
		} catch {}
	};

	return {
		t,
		locale,
		language,
		setLocale,
	};
}
