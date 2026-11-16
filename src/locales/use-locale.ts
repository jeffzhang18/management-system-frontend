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

dayjs.extend(updateLocale);
dayjs.updateLocale("zh-cn", { weekStart: 0 });

type Locale = keyof typeof LocalEnum;
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

export const isLocale = (value: unknown): value is Locale => typeof value === "string" && value in LANGUAGE_MAP;

export const getCurrentLocale = (): Locale => {
	const current = i18nInstance.resolvedLanguage || i18nInstance.language;
	return isLocale(current) ? current : LocalEnum.en_US;
};

export const applyLocaleSetting = (nextLocale: Locale) => {
	void i18nInstance.changeLanguage(nextLocale);
	localStorage.setItem(StorageEnum.I18N, nextLocale);
	document.documentElement.lang = nextLocale;
	dayjs.locale(nextLocale === LocalEnum.zh_CN ? "zh-cn" : "en");
};

export default function useLocale() {
	const { t, i18n } = useTranslation();
	const { accessToken } = useUserToken();
	const userInfo = useUserInfo();
	const { setUserInfo } = useUserActions();

	const locale = (i18n.resolvedLanguage || LocalEnum.en_US) as Locale;
	const language = LANGUAGE_MAP[locale];
	const mapLocaleToDayjsLocale = (nextLocale: Locale) => (nextLocale === LocalEnum.zh_CN ? "zh-cn" : "en");

	const applyLocale = useCallback(
		(nextLocale: Locale) => {
			void i18n.changeLanguage(nextLocale);
			localStorage.setItem(StorageEnum.I18N, nextLocale);
			document.documentElement.lang = nextLocale;
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

	useEffect(() => {
		if (!accessToken && locale !== LocalEnum.en_US) {
			applyLocale(LocalEnum.en_US);
		}
	}, [accessToken, applyLocale, locale]);

	/**
	 * localstorage -> i18nextLng change
	 */
	const setLocale = async (nextLocale: Locale) => {
		if (!accessToken) {
			applyLocale(LocalEnum.en_US);
			return;
		}

		applyLocale(nextLocale);
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
