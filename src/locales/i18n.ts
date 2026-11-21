import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LocalEnum, StorageEnum } from "#/enum";
import { getStringItem } from "@/utils/storage";
import en_US from "./lang/en_US";
import zh_CN from "./lang/zh_CN";
import { htmlLanguage, normalizeLocale, resolveInitialLocale } from "./locale";

const defaultLng = resolveInitialLocale(
	getStringItem(StorageEnum.I18N),
	navigator.languages?.length ? navigator.languages : [navigator.language],
);

// 初始化时设置HTML lang属性，否则系统语言和设定不同时会弹出浏览器的翻译提示
document.documentElement.lang = htmlLanguage(defaultLng);
i18n.on("languageChanged", (language) => {
	document.documentElement.lang = htmlLanguage(normalizeLocale(language) || LocalEnum.en_US);
});

i18n
	// pass the i18n instance to react-i18next.
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		debug: true,
		lng: defaultLng,
		supportedLngs: [LocalEnum.en_US, LocalEnum.zh_CN],
		load: "currentOnly",
		fallbackLng: LocalEnum.en_US,
		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
		resources: {
			en_US: { translation: en_US },
			zh_CN: { translation: zh_CN },
		},
	});

export const { t } = i18n;
export default i18n;
