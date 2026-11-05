import type { Currency, RateSnapshot } from "@/api/services/subscriptionService";

export function convertAmount(amount: string, from: Currency, to: Currency, exchange?: RateSnapshot): string | null {
	if (from === to) return amount;
	const [whole, part = ""] = amount.split(".");
	const cents = BigInt(whole + part.padEnd(2, "0"));
	if (cents === 0n) return "0.00";
	if (!exchange?.rates) return null;
	const source = BigInt(exchange.rates[from].toFixed(12).replace(".", ""));
	const target = BigInt(exchange.rates[to].toFixed(12).replace(".", ""));
	const result = (cents * target * 2n + source) / (source * 2n);
	return `${result / 100n}.${(result % 100n).toString().padStart(2, "0")}`;
}

export function formatMoney(amount: string | null | undefined, currency: Currency, locale: string): string {
	if (amount == null) return "—";
	return new Intl.NumberFormat(locale.replace("_", "-"), {
		style: "currency",
		currency,
		currencyDisplay: "code",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number(amount));
}
