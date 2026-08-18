import i18n from "@/locales/i18n";
import { compareWorkRecords, getRecordTheme, type RecordThemeOption, type WorkRecord } from "./types";

export type ExportFormat = "txt" | "pdf" | "json";

const sorted = (records: WorkRecord[]) =>
	[...records].sort((a, b) => a.date.localeCompare(b.date) || compareWorkRecords(a, b));

const timeLabel = (record: WorkRecord) =>
	record.startTime
		? record.endTime
			? `${record.startTime} - ${record.endTime}`
			: i18n.t("sys.record.fromTime", { time: record.startTime })
		: i18n.t("sys.record.allDay");

const themeLabel = (theme: RecordThemeOption) =>
	theme.custom ? theme.label : i18n.t(`sys.record.themes.${theme.value}`);

const download = (filename: string, content: string, type: string) => {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
};

export function exportRecords(records: WorkRecord[], themes: RecordThemeOption[], range: string, format: ExportFormat) {
	const items = sorted(records);
	const exportTitle = i18n.t("sys.record.title");
	if (format === "json") {
		download(`${exportTitle}_${range}.json`, JSON.stringify(items, null, 2), "application/json;charset=utf-8");
		return true;
	}
	if (format === "txt") {
		const lines = [`${exportTitle} (${range})`, i18n.t("sys.record.dayRecordCount", { count: items.length }), ""];
		for (const record of items) {
			lines.push(
				`${record.date}  [${themeLabel(getRecordTheme(record.theme, themes))}]  ${timeLabel(record)}  ${record.title}`,
			);
			if (record.description) lines.push(record.description, "");
		}
		download(`${exportTitle}_${range}.txt`, lines.join("\n"), "text/plain;charset=utf-8");
		return true;
	}

	const popup = window.open("", "_blank");
	if (!popup) return false;
	const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const content = items
		.map((record) => {
			const theme = getRecordTheme(record.theme, themes);
			return `<article><div class="record-head"><span class="theme" style="--theme:${theme.color}">${escapeHtml(themeLabel(theme))}</span><span class="meta">${record.date} · ${timeLabel(record)}</span></div><h2>${escapeHtml(record.title)}</h2>${record.description ? `<pre>${escapeHtml(record.description)}</pre>` : ""}</article>`;
		})
		.join("");
	popup.document.write(
		`<!doctype html><html lang="${i18n.resolvedLanguage === "zh_CN" ? "zh-CN" : "en-US"}"><head><meta charset="utf-8"><title>${escapeHtml(exportTitle)}_${range}</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#17211b;margin:0}.header{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:18px;border-bottom:3px solid #00a86b}.eyebrow{color:#00a86b;font-size:12px;font-weight:700;letter-spacing:2px}h1{font-size:28px;margin:5px 0}.summary{color:#66756c;font-size:12px}article{margin-top:16px;padding:16px 18px;border:1px solid #dfe8e2;border-radius:10px;page-break-inside:avoid}.record-head{display:flex;align-items:center;gap:10px}.theme{padding:3px 9px;color:var(--theme);font-size:11px;font-weight:700;border-radius:99px;background:color-mix(in srgb,var(--theme) 13%,white)}.meta{font-size:11px;color:#738078}h2{font-size:17px;margin:10px 0 0}pre{margin:10px 0 0;padding-top:10px;color:#405047;font:13px/1.7 inherit;white-space:pre-wrap;border-top:1px dashed #dfe8e2}.footer{margin-top:24px;color:#98a29c;font-size:10px;text-align:center}@media print{article{break-inside:avoid}}</style></head><body><header class="header"><div><div class="eyebrow">WORK RECORDS</div><h1>${escapeHtml(exportTitle)}</h1><div class="summary">${range.replace("_", ` ${i18n.t("sys.record.export.rangeTo")} `)}</div></div><div class="summary">${i18n.t("sys.record.dayRecordCount", { count: items.length })}</div></header><main>${content}</main><div class="footer">${i18n.t("sys.record.export.generatedBy")}</div><script>window.onload=()=>window.print()<\/script></body></html>`,
	);
	popup.document.close();
	return true;
}
