import { readdirSync, readFileSync } from "node:fs";
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import en_US from "./lang/en_US";
import zh_CN from "./lang/zh_CN";
import { htmlLanguage, normalizeLocale, resolveInitialLocale } from "./locale";

describe("language selection before sign in", () => {
	it("keeps an explicit language preference ahead of browser language", () => {
		expect(resolveInitialLocale("zh_CN", ["en-US"])).toBe("zh_CN");
		expect(resolveInitialLocale("en_US", ["zh-CN"])).toBe("en_US");
		expect(resolveInitialLocale("zh-CN", ["en-US"])).toBe("zh_CN");
	});
	it("uses the first supported browser language when no preference is saved", () => {
		expect(resolveInitialLocale(null, ["zh-CN", "en-US"])).toBe("zh_CN");
		expect(resolveInitialLocale("invalid", ["fr-FR", "zh-Hans"])).toBe("zh_CN");
		expect(resolveInitialLocale(null, ["en-GB"])).toBe("en_US");
		expect(resolveInitialLocale(null, ["fr-FR"])).toBe("en_US");
	});
	it("uses valid HTML language tags and rejects unsupported values", () => {
		expect(htmlLanguage("zh_CN")).toBe("zh-CN");
		expect(htmlLanguage("en_US")).toBe("en-US");
		expect(normalizeLocale("constructor")).toBeUndefined();
		expect(normalizeLocale(null)).toBeUndefined();
	});
});

function sourceFiles(directory: URL): URL[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = new URL(entry.name, directory);
		if (entry.isDirectory()) return sourceFiles(new URL(`${entry.name}/`, directory));
		return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
	});
}

describe("Chinese copy for signed-out pages", () => {
	it("provides every referenced sign-in and passkey translation without an English fallback", async () => {
		const i18n = createInstance();
		await i18n.init({
			lng: "zh_CN",
			fallbackLng: "en_US",
			resources: { en_US: { translation: en_US }, zh_CN: { translation: zh_CN } },
		});
		const files = [
			...sourceFiles(new URL("../pages/sys/login/", import.meta.url)),
			...sourceFiles(new URL("../components/passkeys/", import.meta.url)),
			new URL("../components/locale-picker/index.tsx", import.meta.url),
		];
		const keys = new Set(
			files.flatMap((file) =>
				[...readFileSync(file, "utf8").matchAll(/\bt\(\s*["']([^"']+)["']/g)].map((match) => match[1]),
			),
		);
		expect(keys.size).toBeGreaterThan(40);
		for (const key of keys) {
			expect(i18n.getResource("zh_CN", "translation", key), key).toBeTypeOf("string");
			expect(i18n.getResource("en_US", "translation", key), key).toBeTypeOf("string");
			expect(i18n.getResource("zh_CN", "translation", key), key).toMatch(/\p{Script=Han}/u);
		}
		expect(i18n.t("sys.login.signInFormTitle")).toBe("登录到你的账户");
		expect(i18n.t("sys.login.resendIn", { seconds: 30 })).toBe("30s 后重发");
		await i18n.changeLanguage("en_US");
		expect(i18n.t("sys.login.signInFormTitle")).toBe("Login to your account");
		await i18n.changeLanguage("zh_CN");
		expect(i18n.t("sys.login.resetPasswordButton")).toBe("重置密码");
	});
});
