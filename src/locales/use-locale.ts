import "dayjs/locale/zh-cn";

import type { Locale as AntdLocal } from "antd/es/locale";
import en_US from "antd/locale/en_US";
import zh_CN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { UserInfo } from "#/entity";
import { LocalEnum, StorageEnum } from "#/enum";
import userService from "@/api/services/userService";
import { useUserActions, useUserInfo, useUserToken } from "@/store/userStore";

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

export default function useLocale() {
	const { t, i18n } = useTranslation();
	const { accessToken } = useUserToken();
	const userInfo = useUserInfo();
	const { setUserInfo } = useUserActions();

	const locale = (i18n.resolvedLanguage || LocalEnum.en_US) as Locale;
	const language = LANGUAGE_MAP[locale];

	const applyLocale = useCallback(
		(nextLocale: Locale) => {
			void i18n.changeLanguage(nextLocale);
			localStorage.setItem(StorageEnum.I18N, nextLocale);
			document.documentElement.lang = nextLocale;
			dayjs.locale(nextLocale);
		},
		[i18n],
	);

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
