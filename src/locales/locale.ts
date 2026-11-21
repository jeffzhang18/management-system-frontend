import { LocalEnum } from "#/enum";

export type AppLocale = keyof typeof LocalEnum;

export function normalizeLocale(value: unknown): AppLocale | undefined {
	if (typeof value !== "string") return undefined;
	const language = value.trim().toLowerCase().replaceAll("_", "-").split("-")[0];
	if (language === "zh") return LocalEnum.zh_CN;
	if (language === "en") return LocalEnum.en_US;
	return undefined;
}

export function resolveInitialLocale(stored: unknown, browserLanguages: readonly string[]): AppLocale {
	const preferred = normalizeLocale(stored);
	if (preferred) return preferred;
	for (const language of browserLanguages) {
		const supported = normalizeLocale(language);
		if (supported) return supported;
	}
	return LocalEnum.en_US;
}

export const htmlLanguage = (locale: AppLocale) => (locale === LocalEnum.zh_CN ? "zh-CN" : "en-US");
